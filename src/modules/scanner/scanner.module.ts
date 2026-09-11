import { Module } from '@nestjs/common';
import { FfmpegModule } from '../ffmpeg/ffmpeg.module';
import { ScannerService } from './scanner.service';

@Module({
  imports: [FfmpegModule],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
