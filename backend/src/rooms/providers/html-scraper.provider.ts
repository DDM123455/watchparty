import { Injectable, Logger } from '@nestjs/common';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import type { IVideoProvider, ResolvedVideo, StreamType } from './provider.interface';

function streamTypeOf(url: string): StreamType {
  if (/\.(m3u8|vl)/i.test(url)) return 'm3u8';
  if (/\.mpd/i.test(url)) return 'dash';
  if (/\.webm/i.test(url)) return 'webm';
  return 'mp4';
}

@Injectable()
export class HtmlScraperProvider implements IVideoProvider {
  readonly name = 'html-scraper';
  private readonly logger = new Logger(HtmlScraperProvider.name);

  // Catch-all: tried after all domain-specific providers
  canHandle(_url: string): boolean { return true; }

  async extract(url: string): Promise<ResolvedVideo | null> {
    try {
      const html = await this.fetchPage(url);
      return this.extractFromHtml(html, url);
    } catch (err) {
      this.logger.debug(`Scrape failed [${url}]: ${(err as Error).message}`);
      return null;
    }
  }

  extractFromHtml(html: string, baseUrl: string): ResolvedVideo | null {
    // og:video:secure_url — usually a direct mp4 or m3u8
    const ogSecure =
      html.match(/<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:secure_url["']/i);
    if (ogSecure?.[1] && /\.(mp4|webm|m3u8|mpd)/i.test(ogSecure[1])) {
      return { videoUrl: ogSecure[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(ogSecure[1]) };
    }

    // og:video
    const ogVideo =
      html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i);
    if (ogVideo?.[1] && /\.(mp4|webm|m3u8|mpd)/i.test(ogVideo[1])) {
      return { videoUrl: ogVideo[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(ogVideo[1]) };
    }

    // data-link="...m3u8/mp4" — motchill/ophim WordPress patterns
    const dataLink = html.match(/data-link=["']([^"']+\.(?:m3u8|mp4|webm|mpd)(?:[^"'?]*)(?:\?[^"']*)?)["']/i);
    if (dataLink?.[1]) {
      return { videoUrl: dataLink[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(dataLink[1]) };
    }

    // data-file="..." — JWPlayer shortcode pattern
    const dataFile = html.match(/data-file=["']([^"']+\.(?:m3u8|mp4|webm|mpd)[^"']*)["']/i);
    if (dataFile?.[1]) {
      return { videoUrl: dataFile[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(dataFile[1]) };
    }

    // data-src="..." on <video> or custom players
    const dataSrc = html.match(/data-src=["']([^"']+\.(?:m3u8|mp4|webm|mpd)[^"']*)["']/i);
    if (dataSrc?.[1]) {
      return { videoUrl: dataSrc[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(dataSrc[1]) };
    }

    // JWPlayer / Video.js setup: file:"..." or "file":"..."
    const jwFile = html.match(/['"]file['"]\s*:\s*['"]([^'"]+\.(?:m3u8|mp4|webm|mpd)[^'"]*)['"]/i);
    if (jwFile?.[1]) {
      return { videoUrl: jwFile[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(jwFile[1]) };
    }

    // playerConfig sources: [{src:"..."}] — Video.js / Plyr / Shaka patterns
    const vSrc = html.match(/['"]src['"]\s*:\s*['"]([^'"]+\.(?:m3u8|mp4|webm|mpd)[^'"]*)['"]/i);
    if (vSrc?.[1]) {
      return { videoUrl: vSrc[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(vSrc[1]) };
    }

    // player.source = { src: "...", type: "..." }
    const playerSrc = html.match(/player\.source\s*=\s*\{[^}]*src\s*:\s*['"]([^'"]+)["']/i);
    if (playerSrc?.[1] && /\.(m3u8|mp4|webm|mpd)/i.test(playerSrc[1])) {
      return { videoUrl: playerSrc[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(playerSrc[1]) };
    }

    // <source type="video/..." src="...">
    const sourceType =
      html.match(/<source[^>]+type=["']video\/[^"']*["'][^>]+src=["']([^"']+)["']/i) ??
      html.match(/<source[^>]+src=["']([^"']+)["'][^>]+type=["']video\//i);
    if (sourceType?.[1]) {
      const v = this.resolveRelative(sourceType[1], baseUrl);
      return { videoUrl: v, type: 'direct', platform: 'generic', streamType: 'mp4' };
    }

    // <video src="...">
    const videoSrc = html.match(/<video[^>]+src=["']([^"'#][^"']*\.(?:mp4|webm|m3u8|mpd)[^"']*)["']/i);
    if (videoSrc?.[1]) {
      const v = this.resolveRelative(videoSrc[1], baseUrl);
      return { videoUrl: v, type: 'direct', platform: 'generic', streamType: streamTypeOf(v) };
    }

    // Embedded iframe player (e.g. a JWPlayer or custom embed page inside an <iframe>)
    const embedIframe = html.match(
      /<iframe[^>]+src=["']((?:https?:)?\/\/[^"']*(?:embed|player|stream|jwplayer)[^"']*)["']/i,
    );
    if (embedIframe?.[1]) {
      const v = this.resolveRelative(embedIframe[1], baseUrl);
      return { videoUrl: v, type: 'embed', platform: 'generic', streamType: 'iframe' };
    }

    // Broad fallback: any absolute URL in the page containing a video extension as a path
    // segment (handles Flowplayer, custom players whose config is in inline <script> tags).
    // Placed last to avoid false-positive matches from ad/analytics scripts.
    const broadUrl = html.match(
      /["'](https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4|webm|mpd)(?:\/[^"'\s<>]*)?)["']/i,
    );
    if (broadUrl?.[1]) {
      return { videoUrl: broadUrl[1], type: 'direct', platform: 'generic', streamType: streamTypeOf(broadUrl[1]) };
    }

    return null;
  }

  private resolveRelative(src: string, base: string): string {
    if (/^https?:\/\//i.test(src)) return src;
    try {
      const b = new URL(base);
      if (src.startsWith('//')) return `${b.protocol}${src}`;
      if (src.startsWith('/')) return `${b.origin}${src}`;
    } catch { /* ignore */ }
    return src;
  }

  fetchPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? httpsGet : httpGet;
      let data = '';
      let redirected = false;

      const req = mod(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
          },
        },
        (res) => {
          if (
            !redirected &&
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            redirected = true;
            req.destroy();
            this.fetchPage(res.headers.location).then(resolve).catch(reject);
            return;
          }
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            data += chunk;
            // 256 KB is enough to capture all meta tags and player config
            if (data.length > 256 * 1024) { res.destroy(); resolve(data); }
          });
          res.on('end', () => resolve(data));
          res.on('error', reject);
        },
      );

      req.on('error', reject);
      req.setTimeout(8_000, () => { req.destroy(); reject(new Error('timeout')); });
    });
  }
}
