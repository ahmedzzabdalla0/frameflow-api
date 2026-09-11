import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { FfmpegModule } from '../ffmpeg/ffmpeg.module';
import { ScannerModule } from '../scanner/scanner.module';
import { ThumbnailsModule } from '../thumbnails/thumbnails.module';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [CategoriesModule, ScannerModule, FfmpegModule, ThumbnailsModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
