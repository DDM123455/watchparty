import { Injectable } from '@nestjs/common';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

function embedParent(): string {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  try { return new URL(frontendUrl).hostname; } catch { return 'localhost'; }
}

@Injectable()
export class TwitchProvider implements IVideoProvider {
  readonly name = 'twitch';

  canHandle(url: string): boolean {
    return /(?:^|\.)twitch\.tv/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const parent = embedParent();

    // Clip: twitch.tv/clips/ClipName or twitch.tv/channel/clip/ClipName
    const clipM = url.match(/twitch\.tv\/(?:\w+\/clip\/|clips\/)([A-Za-z0-9_-]+)/);
    if (clipM) {
      return {
        videoUrl: `https://clips.twitch.tv/embed?clip=${clipM[1]}&parent=${parent}&autoplay=false`,
        type: 'embed',
        platform: 'twitch',
        streamType: 'iframe',
      };
    }

    // VOD: twitch.tv/videos/1234567
    const vodM = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (vodM) {
      return {
        videoUrl: `https://player.twitch.tv/?video=${vodM[1]}&parent=${parent}&autoplay=false`,
        type: 'embed',
        platform: 'twitch',
        streamType: 'iframe',
      };
    }

    // Live channel: twitch.tv/channelname
    const chanM = url.match(/twitch\.tv\/([A-Za-z0-9_]+)(?:\/)?(?:\?|#|$)/);
    if (chanM && !['videos', 'clips', 'directory', 'p'].includes(chanM[1])) {
      return {
        videoUrl: `https://player.twitch.tv/?channel=${chanM[1]}&parent=${parent}&autoplay=false`,
        type: 'embed',
        platform: 'twitch',
        streamType: 'iframe',
      };
    }

    return null;
  }
}
