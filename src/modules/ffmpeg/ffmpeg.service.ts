import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);

const DEFAULT_THUMBNAIL_SEEK_TIMES: readonly string[] = ['00:00:01', '00:00:00.1'];
const FFPROBE_TIMEOUT_MS = 10_000;
const FFMPEG_TIMEOUT_MS = 15_000;

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  public async probeDurationSeconds(videoAbsolutePath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          videoAbsolutePath,
        ],
        { timeout: FFPROBE_TIMEOUT_MS },
      );
      const parsedDuration = parseFloat(stdout.trim());
      return Number.isFinite(parsedDuration) ? Math.max(0, parsedDuration) : 0;
    } catch (error) {
      this.logger.warn(`ffprobe failed for ${videoAbsolutePath}: ${(error as Error).message}`);
      return 0;
    }
  }

  public async generateThumbnail(
    videoAbsolutePath: string,
    outputAbsolutePath: string,
    seekTime?: string | null,
  ): Promise<boolean> {
    const seekCandidates = seekTime ? [seekTime] : DEFAULT_THUMBNAIL_SEEK_TIMES;

    for (const seek of seekCandidates) {
      try {
        await execFileAsync(
          'ffmpeg',
          [
            '-y',
            '-ss',
            seek,
            '-i',
            videoAbsolutePath,
            '-frames:v',
            '1',
            '-vf',
            'scale=720:-2',
            '-q:v',
            '3',
            outputAbsolutePath,
          ],
          { timeout: FFMPEG_TIMEOUT_MS },
        );
        if (existsSync(outputAbsolutePath)) {
          return true;
        }
      } catch (error) {
        this.logger.warn(`ffmpeg thumbnail generation failed at ${seek}: ${(error as Error).message}`);
      }
    }
    return false;
  }
}
