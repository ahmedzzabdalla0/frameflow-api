import { Module } from '@nestjs/common';
import { FfmpegModule } from '../ffmpeg/ffmpeg.module';
import { ScannerModule } from '../scanner/scanner.module';
import { ThumbnailsController } from './thumbnails.controller';
import { ThumbnailsService } from './thumbnails.service';

@Module({
  imports: [FfmpegModule, ScannerModule],
  controllers: [ThumbnailsController],
  providers: [ThumbnailsService],
  exports: [ThumbnailsService],
})
export class ThumbnailsModule {}
