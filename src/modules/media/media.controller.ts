import { Controller, Get, Header, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { ApiHeader, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MediaService } from './media.service';

const VIDEO_MIME_TYPES: Readonly<Record<string, string>> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
};

const DEFAULT_MIME_TYPE = 'application/octet-stream';

@ApiTags('media')
@Controller('video')
export class MediaController {
  public constructor(private readonly mediaService: MediaService) {}

  @Public()
  @Header('Accept-Ranges', 'bytes')
  @Get(':filename')
  @ApiOperation({ summary: 'Stream a video file, supporting HTTP range requests' })
  @ApiParam({ name: 'filename', description: 'Filename of the video as stored on disk' })
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'Byte range to stream, e.g. "bytes=0-1048575"',
  })
  @ApiProduces('video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska')
  @ApiResponse({ status: 200, description: 'Full file returned when no Range header is present' })
  @ApiResponse({ status: 206, description: 'Partial content returned for a satisfiable Range header' })
  @ApiResponse({ status: 304, description: 'Not modified, based on If-None-Match' })
  @ApiResponse({ status: 416, description: 'Range not satisfiable' })
  public async serveVideo(
    @Param('filename') filename: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { absolutePath, stats } = await this.mediaService.resolveVideoFile(filename);
    const mimeType = VIDEO_MIME_TYPES[extname(absolutePath).toLowerCase()] ?? DEFAULT_MIME_TYPE;
    const etag = `${Math.trunc(stats.mtimeMs)}-${stats.size}`;

    response.setHeader('ETag', etag);
    response.setHeader('Last-Modified', stats.mtime.toUTCString());

    if (request.headers['if-none-match'] === etag) {
      response.status(304).end();
      return;
    }

    const rangeHeader = request.headers.range;
    if (!rangeHeader) {
      response.setHeader('Content-Length', stats.size);
      response.setHeader('Content-Type', mimeType);
      response.status(200);
      createReadStream(absolutePath).pipe(response);
      return;
    }

    const [startRaw, endRaw] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = startRaw ? parseInt(startRaw, 10) : 0;
    const end = endRaw ? parseInt(endRaw, 10) : stats.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stats.size) {
      response.setHeader('Content-Range', `bytes */${stats.size}`);
      response.status(416).end();
      return;
    }

    response.status(206);
    response.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
    response.setHeader('Content-Length', end - start + 1);
    response.setHeader('Content-Type', mimeType);
    createReadStream(absolutePath, { start, end }).pipe(response);
  }
}
