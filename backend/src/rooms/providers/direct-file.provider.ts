import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo, StreamType } from './provider.interface';

const DIRECT_RE = /\.(mp4|webm|ogg|mov|m3u8|vl|mpd)(\?.*)?$/i;

@Injectable()
export class DirectFileProvider implements IVideoProvider {
  readonly name = 'direct-file';

  canHandle(url: string): boolean {
    return DIRECT_RE.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    let streamType: StreamType = 'mp4';
    if (/\.(m3u8|vl)/i.test(url)) streamType = 'm3u8';
    else if (/\.mpd/i.test(url)) streamType = 'dash';
    else if (/\.webm/i.test(url)) streamType = 'webm';

    return { videoUrl: url, type: 'direct', platform: 'direct', streamType };
  }
}
