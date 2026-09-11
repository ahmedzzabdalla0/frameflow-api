import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { AppConfig } from '../../config/configuration';

export interface ResolvedVideoFile {
  absolutePath: string;
  stats: Stats;
}

@Injectable()
export class MediaService {
  private readonly uploadsDir: string;
  private readonly videoExtensions: ReadonlySet<string>;

  public constructor(configService: ConfigService<AppConfig, true>) {
    this.uploadsDir = configService.get('storage.uploadsDir', { infer: true });
    this.videoExtensions = new Set(configService.get('storage.videoExtensions', { infer: true }));
  }

  public async resolveVideoFile(rawFilename: string): Promise<ResolvedVideoFile> {
    const fileName = rawFilename.replace(/\\/g, '/').split('/').pop() ?? rawFilename;
    const extension = extname(fileName).toLowerCase();

    if (!this.videoExtensions.has(extension)) {
      throw new NotFoundException('Unsupported media type');
    }

    const absolutePath = join(this.uploadsDir, fileName);

    try {
      const stats = await stat(absolutePath);
      if (!stats.isFile()) {
        throw new NotFoundException('Video not found');
      }
      return { absolutePath, stats };
    } catch {
      throw new NotFoundException('Video not found');
    }
  }
}
