import { Injectable, Logger } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

// These providers extract a video URL from a page URL — the extracted video URL
// may be on the same origin as the page, which typically means the server enforces
// hotlink protection (Referer check). Flag such results so the frontend knows to
// route playback through the backend proxy which sets the correct Referer.
const HOTLINK_PRONE = new Set(['html-scraper', 'puppeteer-extractor']);
import { YoutubeProvider } from './youtube.provider';
import { VimeoProvider } from './vimeo.provider';
import { DailymotionProvider } from './dailymotion.provider';
import { TwitchProvider } from './twitch.provider';
import { StreamableProvider } from './streamable.provider';
import { DirectFileProvider } from './direct-file.provider';
import { BilibiliTvProvider } from './bilibili-tv.provider';
import { HtmlScraperProvider } from './html-scraper.provider';
import { PuppeteerExtractorProvider } from './puppeteer-extractor.provider';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly chain: IVideoProvider[];

  constructor(
    youtube: YoutubeProvider,
    vimeo: VimeoProvider,
    dailymotion: DailymotionProvider,
    twitch: TwitchProvider,
    streamable: StreamableProvider,
    directFile: DirectFileProvider,
    bilibiliTv: BilibiliTvProvider,
    htmlScraper: HtmlScraperProvider,
    puppeteerExtractor: PuppeteerExtractorProvider,
  ) {
    // Fast/specific providers run first; heavy fallbacks last
    this.chain = [
      youtube,
      directFile,   // before iframe providers so .m3u8/.mp4 direct URLs resolve immediately
      vimeo,
      dailymotion,
      twitch,
      streamable,
      bilibiliTv,           // domain-specific API extraction before generic scrapers
      htmlScraper,          // fast HTML regex — no browser needed
      puppeteerExtractor,   // full browser — last resort
    ];
  }

  async resolve(url: string): Promise<ResolvedVideo | null> {
    for (const provider of this.chain) {
      if (!provider.canHandle(url)) continue;
      try {
        const result = await provider.extract(url);
        if (result) {
          this.logger.debug(`Resolved via ${provider.name}: ${result.videoUrl.slice(0, 80)}`);
          // Auto-detect hotlink protection: same-origin video extracted from a page
          if (HOTLINK_PRONE.has(provider.name) && result.type !== 'embed') {
            try {
              if (new URL(url).origin === new URL(result.videoUrl).origin) {
                result.needsProxy = true;
              }
            } catch { /* ignore unparseable URLs */ }
          }
          return result;
        }
      } catch (err) {
        this.logger.warn(`${provider.name} threw: ${(err as Error).message}`);
      }
    }
    return null;
  }
}
