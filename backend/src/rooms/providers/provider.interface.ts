export type StreamType = 'youtube' | 'mp4' | 'webm' | 'm3u8' | 'dash' | 'iframe';

export interface ResolvedVideo {
  videoUrl: string;
  type: 'youtube' | 'direct' | 'embed';
  platform: string;
  streamType: StreamType;
  /** Hint: the frontend should proxy all segment/chunk requests through the backend */
  needsProxy?: boolean;
}

export interface IVideoProvider {
  readonly name: string;
  /** Quick synchronous pre-check — pure regex, no I/O */
  canHandle(url: string): boolean;
  extract(url: string): Promise<ResolvedVideo | null>;
}
