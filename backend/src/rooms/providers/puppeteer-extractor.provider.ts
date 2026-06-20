import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo, StreamType } from './provider.interface';
import { PuppeteerService } from '../puppeteer.service';

@Injectable()
export class PuppeteerExtractorProvider implements IVideoProvider {
  readonly name = 'puppeteer-extractor';

  constructor(private readonly puppeteer: PuppeteerService) {}

  // Last resort: handles anything the earlier providers missed
  canHandle(_url: string): boolean { return true; }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const videoUrl = await this.puppeteer.extractVideoUrl(url);
    if (!videoUrl) return null;

    let streamType: StreamType = 'mp4';
    if (/\.(m3u8|vl)/i.test(videoUrl)) streamType = 'm3u8';
    else if (/\.mpd/i.test(videoUrl)) streamType = 'dash';
    else if (/\.webm/i.test(videoUrl)) streamType = 'webm';
    else if (/^https?:\/\//i.test(videoUrl) && !/\.(mp4|webm|mpd|m3u8)/i.test(videoUrl)) {
      streamType = 'iframe';
    }

    return {
      videoUrl,
      type: streamType === 'iframe' ? 'embed' : 'direct',
      platform: 'generic',
      streamType,
    };
  }
}
