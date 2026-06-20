import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

@Injectable()
export class StreamableProvider implements IVideoProvider {
  readonly name = 'streamable';

  canHandle(url: string): boolean {
    return /streamable\.com/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const m = url.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/);
    if (!m) return null;
    return {
      videoUrl: `https://streamable.com/e/${m[1]}`,
      type: 'embed',
      platform: 'streamable',
      streamType: 'iframe',
    };
  }
}
