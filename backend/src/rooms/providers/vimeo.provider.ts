import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

@Injectable()
export class VimeoProvider implements IVideoProvider {
  readonly name = 'vimeo';

  canHandle(url: string): boolean {
    return /vimeo\.com/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (!m) return null;
    return {
      videoUrl: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`,
      type: 'embed',
      platform: 'vimeo',
      streamType: 'iframe',
    };
  }
}
