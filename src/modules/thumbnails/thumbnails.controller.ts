import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClearThumbsResponseDto } from './dto/clear-thumbs-response.dto';
import { SetThumbSeekDto } from './dto/set-thumb-seek.dto';
import { ThumbnailsService } from './thumbnails.service';

const PLACEHOLDER_THUMBNAIL_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">' +
    '<rect width="320" height="180" fill="#1a1a1a"/>' +
    '<text x="160" y="95" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif">&#9654;</text>' +
    '</svg>',
);

@ApiTags('thumbnails')
@Controller()
export class ThumbnailsController {
  public constructor(private readonly thumbnailsService: ThumbnailsService) {}

  @Public()
  @Get('thumb/:relPath')
  @ApiOperation({ summary: 'Get a video thumbnail, generating it on demand if needed' })
  @ApiParam({ name: 'relPath', description: 'Relative path of the video, URL-encoded' })
  @ApiProduces('image/jpeg', 'image/svg+xml')
  @ApiResponse({ status: HttpStatus.OK, description: 'Thumbnail image, or a placeholder SVG if unavailable' })
  public async serveThumbnail(@Param('relPath') relPath: string, @Res() res: Response): Promise<void> {
    const thumbnailPath = await this.thumbnailsService.resolveOrGenerateThumbnail(relPath);

    if (!thumbnailPath) {
      res.set('Cache-Control', 'no-store');
      res.type('image/svg+xml').send(PLACEHOLDER_THUMBNAIL_SVG);
      return;
    }

    res.sendFile(thumbnailPath);
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('set-thumb-seek')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set the timestamp used to generate a video's thumbnail" })
  @ApiResponse({ status: HttpStatus.OK, type: OkResponseDto })
  public async setThumbSeek(@Body() setThumbSeekDto: SetThumbSeekDto): Promise<OkResponseDto> {
    return this.thumbnailsService.setThumbSeek(setThumbSeekDto);
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('clear-thumbs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all cached thumbnails so they regenerate on next request' })
  @ApiResponse({ status: HttpStatus.OK, type: ClearThumbsResponseDto })
  public async clearThumbs(): Promise<ClearThumbsResponseDto> {
    const deleted = await this.thumbnailsService.clearAllThumbnails();
    return { ok: true, deleted };
  }
}
