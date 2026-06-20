import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as http from 'node:http';
import * as https from 'node:https';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { VideoResolverService } from './video-resolver.service';
import { PuppeteerService } from './puppeteer.service';
import { WatchGateway } from '../watch/watch.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import type { User } from '../users/user.entity';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly videoResolver: VideoResolverService,
    private readonly puppeteerService: PuppeteerService,
    @Inject(forwardRef(() => WatchGateway))
    private readonly watchGateway: WatchGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request, @Body() dto: CreateRoomDto) {
    const user = req.user as User;
    return this.roomsService.create(user.id, dto);
  }

  @Get()
  findAll() {
    return this.roomsService.findPublicRooms();
  }

  // Must be declared BEFORE :id to avoid shadowing
  @Get('resolve-video')
  @UseGuards(JwtAuthGuard)
  async resolveVideo(@Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param required');
    const result = await this.videoResolver.resolve(url);
    return result ?? { videoUrl: null, type: null, platform: null, streamType: null };
  }

  /**
   * Universal media proxy: handles HLS (.m3u8), DASH (.mpd), and raw video/TS segments.
   * - Manifests: rewrites relative segment URLs to absolute so the player can resolve them.
   * - Segments / MP4 chunks: forwards with CORS headers and passes through Range headers for
   *   byte-range seeking without downloading the full file.
   * No auth required — only media content is proxied.
   */
  @Get('hls-proxy')
  async hlsProxy(@Query('url') encodedUrl: string, @Req() req: Request, @Res() res: Response) {
    if (!encodedUrl) { res.status(400).end(); return; }

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(encodedUrl);
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol');
    } catch {
      res.status(400).end();
      return;
    }

    const mod = targetUrl.startsWith('https') ? https : http;
    const parsedTarget = new URL(targetUrl);
    const origin = parsedTarget.origin;

    // Determine whether this is a manifest by URL extension
    const isHlsManifest = /\.(m3u8|vl)(\?|#|$)/i.test(targetUrl);
    const isDashManifest = /\.mpd(\?|#|$)/i.test(targetUrl);
    const isManifest = isHlsManifest || isDashManifest;

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Referer': `${origin}/`,
      'Accept': '*/*',
    };

    // If Puppeteer previously solved a CF challenge for this hostname, reuse the clearance
    // cookie. cf_clearance is IP-bound — same server IP, so it stays valid for proxy requests.
    const cfCookie = this.puppeteerService.getCookieHeader(parsedTarget.hostname);
    if (cfCookie) upstreamHeaders['Cookie'] = cfCookie;

    // Forward Range header for byte-range seeking (segments and MP4 files only — not manifests)
    const rangeHeader = (req.headers as Record<string, string | undefined>)['range'];
    if (rangeHeader && !isManifest) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    await new Promise<void>((resolve) => {
      const proxyReq = mod.get(targetUrl, { headers: upstreamHeaders }, (upstream) => {
        // Follow one redirect
        if (
          upstream.statusCode &&
          upstream.statusCode >= 300 &&
          upstream.statusCode < 400 &&
          upstream.headers.location
        ) {
          upstream.resume();
          const location = upstream.headers.location.startsWith('http')
            ? upstream.headers.location
            : `${origin}${upstream.headers.location}`;
          res.redirect(307, `/rooms/hls-proxy?url=${encodeURIComponent(location)}`);
          resolve();
          return;
        }

        const ct = upstream.headers['content-type'] ?? '';
        const looksLikeHls = isHlsManifest || /mpegurl|m3u8/i.test(ct);
        const looksLikeDash = isDashManifest || /dash\+xml/i.test(ct);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        if (looksLikeDash) {
          res.setHeader('Content-Type', 'application/dash+xml');
          let body = '';
          upstream.setEncoding('utf8');
          upstream.on('data', (chunk: string) => { body += chunk; });
          upstream.on('end', () => {
            res.end(this.rewriteDashManifest(body, targetUrl));
            resolve();
          });
          upstream.on('error', () => { res.status(502).end(); resolve(); });
        } else if (looksLikeHls) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          let body = '';
          upstream.setEncoding('utf8');
          upstream.on('data', (chunk: string) => { body += chunk; });
          upstream.on('end', () => {
            res.end(this.rewriteHlsManifest(body, targetUrl));
            resolve();
          });
          upstream.on('error', () => { res.status(502).end(); resolve(); });
        } else {
          // Segment, MP4 chunk, or raw video — forward with range support
          const statusCode = upstream.statusCode ?? 200;
          res.status(statusCode);
          res.setHeader('Content-Type', ct || 'video/MP2T');

          // Forward range / content length headers so browsers can seek
          if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
          if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
          else res.setHeader('Accept-Ranges', 'bytes');
          if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);

          upstream.pipe(res);
          res.on('finish', resolve);
          upstream.on('error', () => resolve());
        }
      });

      proxyReq.on('error', () => { res.status(502).end(); resolve(); });
      proxyReq.setTimeout(15_000, () => { proxyReq.destroy(); res.status(504).end(); resolve(); });
    });
  }

  // Rewrite relative segment/init URLs in an HLS manifest to absolute proxy URLs.
  // HLS.js's ProxyLoader on the frontend wraps every URL in /rooms/hls-proxy so that
  // CORS-restricted CDNs are accessed server-side.
  private rewriteHlsManifest(content: string, manifestUrl: string): string {
    const base = new URL(manifestUrl);
    const dir = base.origin + base.pathname.replace(/\/[^/]*$/, '/');
    return content
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        return this.toAbsolute(t, base.origin, dir);
      })
      .join('\n');
  }

  // Rewrite relative BaseURL elements and segment template attributes in a DASH manifest.
  private rewriteDashManifest(content: string, manifestUrl: string): string {
    const base = new URL(manifestUrl);
    const dir = base.origin + base.pathname.replace(/\/[^/]*$/, '/');

    return content
      // <BaseURL>relative/path</BaseURL>
      .replace(/<BaseURL>([^<]+)<\/BaseURL>/gi, (_, href) => {
        return `<BaseURL>${this.toAbsolute(href.trim(), base.origin, dir)}</BaseURL>`;
      })
      // initialization="..." and media="..." attributes in SegmentTemplate
      .replace(/\b(initialization|media)="([^"]+)"/gi, (match, attr: string, href: string) => {
        if (/^https?:\/\//i.test(href)) return match;
        return `${attr}="${this.toAbsolute(href, base.origin, dir)}"`;
      });
  }

  private toAbsolute(href: string, origin: string, dir: string): string {
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `${origin}${href}`;
    return `${dir}${href}`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findByRoomId(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    await this.roomsService.deleteRoom(id, user.id);
    this.watchGateway.kickRoom(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  joinRoom(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: JoinRoomDto,
  ) {
    const user = req.user as User;
    return this.roomsService.joinRoom(id, user.id, dto);
  }
}
