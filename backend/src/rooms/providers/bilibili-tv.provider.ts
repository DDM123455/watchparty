import { Injectable, Logger } from '@nestjs/common';
import { get as httpsGet } from 'https';
import type { IVideoProvider, ResolvedVideo } from './provider.interface';

interface BiliDashTrack { id: number; base_url: string; bandwidth: number }
interface BiliPlayData {
  dash?: { video?: BiliDashTrack[]; audio?: BiliDashTrack[] };
  durl?: { url: string; backup_url?: string[] }[];
  video_resource?: { video_url?: string; hls_url?: string };
}

@Injectable()
export class BilibiliTvProvider implements IVideoProvider {
  readonly name = 'bilibili-tv';
  private readonly logger = new Logger(BilibiliTvProvider.name);

  canHandle(url: string): boolean {
    return /bilibili\.tv/i.test(url);
  }

  async extract(url: string): Promise<ResolvedVideo | null> {
    const epMatch = url.match(/\/(?:video|ep)\/(\d+)/);
    if (!epMatch) return null;
    const episodeId = epMatch[1];

    try {
      const data = await this.callApi(episodeId);
      return this.parsePlayData(data);
    } catch (err) {
      this.logger.debug(`Bilibili TV API failed for ep ${episodeId}: ${(err as Error).message}`);
      return null;
    }
  }

  private callApi(episodeId: string): Promise<unknown> {
    const apiUrl =
      `https://www.bilibili.tv/api/ogv/play/episode` +
      `?episode_id=${episodeId}&platform=web&area=&s_locale=en_US`;

    return new Promise((resolve, reject) => {
      const req = httpsGet(
        apiUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
            Referer: 'https://www.bilibili.tv/',
            Origin: 'https://www.bilibili.tv',
            Accept: 'application/json, */*',
          },
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => { body += c; });
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error('Non-JSON response')); }
          });
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.setTimeout(8_000, () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  private parsePlayData(raw: unknown): ResolvedVideo | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (r['code'] !== 0) {
      this.logger.debug(`Bilibili TV API error code ${String(r['code'])}: ${String(r['message'] ?? '')}`);
      return null;
    }

    const data = (r['data'] as Record<string, unknown>) ?? {};
    // Try several known response shapes
    const play = (data['playurl'] ?? data['play_url'] ?? data) as BiliPlayData;

    // DASH — pick best quality video track
    if (play.dash?.video?.length) {
      const best = play.dash.video.reduce((a, b) => (b.bandwidth > a.bandwidth ? b : a));
      return {
        videoUrl: best.base_url,
        type: 'direct',
        platform: 'bilibili-tv',
        streamType: 'dash',
        needsProxy: true,
      };
    }

    // durl (old MP4 / FLV format)
    if (play.durl?.length) {
      const videoUrl = play.durl[0].url;
      return {
        videoUrl,
        type: 'direct',
        platform: 'bilibili-tv',
        streamType: 'mp4',
        needsProxy: true,
      };
    }

    // video_resource (some newer API shapes)
    if (play.video_resource?.hls_url) {
      return {
        videoUrl: play.video_resource.hls_url,
        type: 'direct',
        platform: 'bilibili-tv',
        streamType: 'm3u8',
        needsProxy: true,
      };
    }
    if (play.video_resource?.video_url) {
      return {
        videoUrl: play.video_resource.video_url,
        type: 'direct',
        platform: 'bilibili-tv',
        streamType: 'mp4',
        needsProxy: true,
      };
    }

    return null;
  }
}
