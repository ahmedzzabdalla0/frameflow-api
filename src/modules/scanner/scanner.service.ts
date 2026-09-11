import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Video } from '@prisma/client';
import { readdir, stat } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';
import { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly uploadsDir: string;
  private readonly videoExtensions: ReadonlySet<string>;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly ffmpegService: FfmpegService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.uploadsDir = configService.get('storage.uploadsDir', { infer: true });
    this.videoExtensions = new Set(configService.get('storage.videoExtensions', { infer: true }));
  }

  public resolveAbsolutePath(relPath: string): string {
    const normalizedFileName = relPath.replace(/\\/g, '/').split('/').pop() ?? relPath;
    return join(this.uploadsDir, normalizedFileName);
  }

  public getUploadsDir(): string {
    return this.uploadsDir;
  }

  public async scanForNewVideos(): Promise<Video[]> {
    const entries = await this.listUploadDirectory();
    const newlyAdded: Video[] = [];

    for (const fileName of entries) {
      const extension = extname(fileName).toLowerCase();
      if (!this.videoExtensions.has(extension)) {
        continue;
      }

      const existingVideo = await this.prisma.video.findUnique({ where: { relPath: fileName } });
      if (existingVideo) {
        continue;
      }

      const absolutePath = join(this.uploadsDir, fileName);
      const sizeBytes = await this.safeFileSize(absolutePath);
      const durationSeconds = await this.ffmpegService.probeDurationSeconds(absolutePath);

      const createdVideo = await this.prisma.video.create({
        data: {
          relPath: fileName,
          title: parse(fileName).name,
          sizeBytes: BigInt(sizeBytes),
          durationSeconds,
        },
      });

      newlyAdded.push(createdVideo);
    }

    return newlyAdded;
  }

  private async listUploadDirectory(): Promise<string[]> {
    try {
      const dirents = await readdir(this.uploadsDir, { withFileTypes: true });
      return dirents
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      this.logger.error(`Unable to read uploads directory ${this.uploadsDir}: ${(error as Error).message}`);
      return [];
    }
  }

  private async safeFileSize(absolutePath: string): Promise<number> {
    try {
      const fileStat = await stat(absolutePath);
      return fileStat.size;
    } catch {
      return 0;
    }
  }
}
