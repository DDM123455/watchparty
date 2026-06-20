import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

@Injectable()
export class DailymotionProvider implements IVideoProvider {
  readonly name = 'dailymotion';

  canHandle(url: string): boolean {
    return /dailymotion\.com/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const m = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (!m) return null;
    return {
      videoUrl: `https://www.dailymotion.com/embed/video/${m[1]}?autoplay=1&mute=1`,
      type: 'embed',
      platform: 'dailymotion',
      streamType: 'iframe',
    };
  }
}
