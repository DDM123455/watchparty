import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { VideoResolverService } from './video-resolver.service';
import { PuppeteerService } from './puppeteer.service';
import { AuthModule } from '../auth/auth.module';
import { WatchModule } from '../watch/watch.module';
import { YoutubeProvider } from './providers/youtube.provider';
import { VimeoProvider } from './providers/vimeo.provider';
import { DailymotionProvider } from './providers/dailymotion.provider';
import { TwitchProvider } from './providers/twitch.provider';
import { StreamableProvider } from './providers/streamable.provider';
import { DirectFileProvider } from './providers/direct-file.provider';
import { BilibiliTvProvider } from './providers/bilibili-tv.provider';
import { HtmlScraperProvider } from './providers/html-scraper.provider';
import { PuppeteerExtractorProvider } from './providers/puppeteer-extractor.provider';
import { ProviderRegistryService } from './providers/provider-registry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    AuthModule,
    forwardRef(() => WatchModule),
  ],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    PuppeteerService,
    YoutubeProvider,
    VimeoProvider,
    DailymotionProvider,
    TwitchProvider,
    StreamableProvider,
    DirectFileProvider,
    BilibiliTvProvider,
    HtmlScraperProvider,
    PuppeteerExtractorProvider,
    ProviderRegistryService,
    VideoResolverService,
  ],
  exports: [RoomsService],
})
export class RoomsModule {}
