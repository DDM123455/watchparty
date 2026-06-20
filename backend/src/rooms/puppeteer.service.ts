import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer';

// .vl is used by some CDNs as an HLS manifest (Content-Type: application/x-mpegurl)
// Allow / after the extension (e.g. /get_file/video.mp4/?rnd=123 is common on some sites)
const VIDEO_RE = /\.(m3u8|mp4|webm|vl|mpd)(?:[/?#]|$)/i;
// MIME types that signal a video manifest regardless of file extension
const VIDEO_MIME_RE = /^(application\/(dash\+xml|x-mpegurl|vnd\.apple\.mpegurl)|video\/)/i;
const EMBED_IFRAME_RE = /embed|player|stream|jwplayer/i;
const BLOCK_TYPES = new Set(['image', 'font', 'stylesheet', 'media']);

// Selectors to try clicking when the video hasn't started loading on its own
const PLAY_SELECTORS = [
  'button[class*="play"]',
  '.play-btn', '.play-button', '.btn-play',
  '[data-plyr="play"]',
  '.jw-icon-playback', '.jw-display-icon-display',
  '.vjs-big-play-button',
  '[aria-label*="play" i]',
  '.player-play',
].join(',');

@Injectable()
export class PuppeteerService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  // Stores Cloudflare clearance cookies keyed by hostname.
  // The cf_clearance cookie is IP-bound, so the backend proxy (same IP) can reuse it.
  private readonly cfCookieCache = new Map<string, { value: string; expiry: number }>();

  getCookieHeader(hostname: string): string | null {
    const entry = this.cfCookieCache.get(hostname);
    if (!entry) return null;
    if (Date.now() > entry.expiry) { this.cfCookieCache.delete(hostname); return null; }
    return `cf_clearance=${entry.value}`;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (!this.browserPromise) {
      this.browserPromise = (async () => {
        // puppeteer-extra + stealth bypasses Cloudflare's bot detection
        // (navigator.webdriver, chrome runtime, permissions API, etc.)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const puppeteerExtra = require('puppeteer-extra') as {
          use: (p: unknown) => void;
          launch: (opts: Record<string, unknown>) => Promise<Browser>;
        };
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const StealthPlugin = require('puppeteer-extra-plugin-stealth') as () => unknown;
        puppeteerExtra.use(StealthPlugin());

        const b = await puppeteerExtra.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            // Remove the flag that sets navigator.webdriver = true
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,720',
          ],
          // Remove --enable-automation which Cloudflare checks
          ignoreDefaultArgs: ['--enable-automation'],
        }) as unknown as Browser;

        b.on('disconnected', () => {
          this.browser = null;
          this.browserPromise = null;
        });
        this.browser = b;
        return b;
      })().catch(err => {
        this.browserPromise = null;
        throw err;
      });
    }
    return this.browserPromise;
  }

  async extractVideoUrl(pageUrl: string, timeoutMs = 20_000): Promise<string | null> {
    let browser: Browser;
    try {
      browser = await this.getBrowser();
    } catch (err) {
      this.logger.error(`Browser unavailable: ${(err as Error).message}`);
      return null;
    }

    let page: Page | null = null;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      );
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      });

      let captured: string | null = null;
      let notifyCapture!: () => void;
      const captureSignal = new Promise<void>(r => { notifyCapture = r; });

      await page.setRequestInterception(true);

      page.on('request', req => {
        const u = req.url();
        if (!captured && !u.startsWith('blob:') && VIDEO_RE.test(u)) {
          captured = u;
          notifyCapture();
        }
        if (BLOCK_TYPES.has(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      page.on('response', res => {
        const u = res.url();
        if (captured || u.startsWith('blob:')) return;
        const ct = res.headers()['content-type'] ?? '';
        if (VIDEO_RE.test(u) || VIDEO_MIME_RE.test(ct)) {
          captured = u;
          notifyCapture();
        }
      });

      let deadline = Date.now() + timeoutMs;

      await page
        .goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
        .catch(() => null);

      // Detect Cloudflare Managed Challenge in any language (not just English).
      // CF now localises the challenge UI, so we cannot rely on "Just a moment" alone.
      const onChallenge = await page
        .evaluate(() => {
          // window._cf_chl_opt is injected by every CF challenge type
          if ('_cf_chl_opt' in window) return true;
          // Challenge platform orchestration script
          if (document.querySelector('script[src*="challenge-platform"]')) return true;
          // Legacy / intermediate challenge selectors
          if (document.querySelector('#challenge-form, #cf-challenge-running, #cf-spinner, .captcha-box'))
            return true;
          const t = document.title.toLowerCase();
          return (
            t.includes('just a moment') ||
            t.includes('xác minh')       ||   // Vietnamese CF page
            t.includes('security check') ||
            t.includes('attention required') ||
            t.includes('checking your browser')
          );
        })
        .catch(() => false);

      if (onChallenge) {
        this.logger.log(`[Puppeteer] Cloudflare challenge detected on ${pageUrl}, waiting for resolution…`);
        // CF Managed Challenge auto-resolves via JS and then redirects back to the page.
        // waitForFunction fires as soon as _cf_chl_opt is removed (challenge passed).
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null),
          page.waitForFunction(() => !('_cf_chl_opt' in window), { timeout: 20_000 }).catch(() => null),
        ]);
        // Extract cf_clearance so the backend proxy can reuse it (same IP = valid)
        try {
          const cfCookies = await page.cookies();
          const cfClear = cfCookies.find(c => c.name === 'cf_clearance');
          if (cfClear) {
            const hostname = new URL(pageUrl).hostname;
            const expiry = cfClear.expires > 0 ? cfClear.expires * 1000 : Date.now() + 3_600_000;
            this.cfCookieCache.set(hostname, { value: cfClear.value, expiry });
            this.logger.log(`[Puppeteer] Cached cf_clearance for ${hostname}`);
          }
        } catch { /* ignore */ }
        // Give the real page 2 s to load its player scripts after the challenge redirect
        await new Promise(r => setTimeout(r, 2_000));
        // Reset deadline: challenge consumed time, allow full window for video capture
        deadline = Date.now() + 15_000;
      }

      // Give JS up to 8 s to fire video network requests
      const remaining = Math.min(deadline - Date.now(), 8_000);
      if (!captured && remaining > 100) {
        await Promise.race([captureSignal, new Promise(r => setTimeout(r, remaining))]);
      }

      // If still nothing, try clicking the video play button (lazy-load players)
      if (!captured) {
        await page
          .evaluate((sel: string) => {
            const btn = document.querySelector<HTMLElement>(sel);
            btn?.click();
          }, PLAY_SELECTORS)
          .catch(() => null);

        const afterClick = Math.min(deadline - Date.now(), 5_000);
        if (afterClick > 100) {
          await Promise.race([captureSignal, new Promise(r => setTimeout(r, afterClick))]);
        }
      }

      if (captured) return captured;

      // DOM fallback
      const domResult = await page
        .evaluate(() => {
          const video = document.querySelector<HTMLVideoElement>('video');
          if (video?.src && /^https?:/.test(video.src)) return video.src;
          const source = document.querySelector<HTMLSourceElement>('source[src]');
          if (source?.src && /^https?:/.test(source.src)) return source.src;
          return null;
        })
        .catch(() => null);

      if (domResult) return domResult;

      // Iframe player fallback
      const playerIframeUrl = await page
        .evaluate((embedRe: string) => {
          const re = new RegExp(embedRe, 'i');
          for (const el of Array.from(document.querySelectorAll('iframe[src]'))) {
            const src = (el as HTMLIFrameElement).src;
            if (src && re.test(src) && /^https?:\/\//i.test(src)) return src;
          }
          return null;
        }, EMBED_IFRAME_RE.source)
        .catch(() => null);

      if (!playerIframeUrl || playerIframeUrl === pageUrl) return null;

      let playerPage: Page | null = null;
      try {
        playerPage = await browser.newPage();
        await playerPage.setViewport({ width: 1280, height: 720 });
        await playerPage.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        );

        let playerCaptured: string | null = null;
        let notifyPlayer!: () => void;
        const playerSignal = new Promise<void>(r => { notifyPlayer = r; });

        await playerPage.setRequestInterception(true);
        playerPage.on('request', req => {
          const u = req.url();
          if (!playerCaptured && !u.startsWith('blob:') && VIDEO_RE.test(u)) {
            playerCaptured = u;
            notifyPlayer();
          }
          if (BLOCK_TYPES.has(req.resourceType())) req.abort();
          else req.continue();
        });
        playerPage.on('response', res => {
          const u = res.url();
          if (playerCaptured || u.startsWith('blob:')) return;
          const ct = res.headers()['content-type'] ?? '';
          if (VIDEO_RE.test(u) || VIDEO_MIME_RE.test(ct)) {
            playerCaptured = u;
            notifyPlayer();
          }
        });

        const playerDeadline = Math.max(Math.min(deadline - Date.now(), 10_000), 3_000);
        await playerPage
          .goto(playerIframeUrl, { waitUntil: 'domcontentloaded', timeout: playerDeadline })
          .catch(() => null);

        const playerRemaining = Math.max(Math.min(deadline - Date.now(), 7_000), 0);
        if (!playerCaptured && playerRemaining > 100) {
          await Promise.race([playerSignal, new Promise(r => setTimeout(r, playerRemaining))]);
        }

        if (playerCaptured) return playerCaptured;
      } finally {
        await playerPage?.close().catch(() => null);
      }

      this.logger.log(`[Puppeteer] Returning embed fallback: ${playerIframeUrl}`);
      return playerIframeUrl;

    } catch (err) {
      this.logger.warn(`[Puppeteer] Extract failed [${pageUrl}]: ${(err as Error).message}`);
      return null;
    } finally {
      await page?.close().catch(() => null);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close().catch(() => null);
    this.browser = null;
  }
}
