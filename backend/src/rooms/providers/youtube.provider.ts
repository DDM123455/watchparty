import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

@Injectable()
export class YoutubeProvider implements IVideoProvider {
  readonly name = 'youtube';

  canHandle(url: string): boolean {
    return /(?:youtube\.com\/(?:watch|shorts|embed|live)|youtu\.be\/)/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    if (!this.canHandle(url)) return null;
    return { videoUrl: url, type: 'youtube', platform: 'youtube', streamType: 'youtube' };
  }
}
