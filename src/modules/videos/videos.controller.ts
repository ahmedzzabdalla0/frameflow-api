import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BulkUpdateCategoriesDto } from './dto/bulk-update-categories.dto';
import { QueryVideosDto } from './dto/query-videos.dto';
import { RefreshMetadataDto } from './dto/refresh-metadata.dto';
import { SetRatingDto } from './dto/set-rating.dto';
import { ToggleDislikeDto } from './dto/toggle-dislike.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import {
  BulkUpdateCategoriesResponseDto,
  RefreshMetadataResponseDto,
  ScanResponseDto,
  SetRatingResponseDto,
  ToggleDislikeResponseDto,
  UpdateVideoResponseDto,
} from './dto/video-operation-response.dto';
import { PaginatedVideosResponseDto, VideoStatsResponseDto } from './dto/video-response.dto';
import { VideosService } from './videos.service';

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  public constructor(private readonly videosService: VideosService) {}

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get aggregate video statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: VideoStatsResponseDto })
  public async getStats(): Promise<VideoStatsResponseDto> {
    return this.videosService.getStats();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List videos with filtering, sorting and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedVideosResponseDto })
  public async listVideos(@Query() query: QueryVideosDto): Promise<PaginatedVideosResponseDto> {
    return this.videosService.listVideos(query);
  }

  @Roles('ADMIN')
  @Put('bulk-categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a set of categories to many videos at once' })
  @ApiResponse({ status: HttpStatus.OK, type: BulkUpdateCategoriesResponseDto })
  public async bulkUpdateCategories(
    @Body() bulkUpdateCategoriesDto: BulkUpdateCategoriesDto,
  ): Promise<BulkUpdateCategoriesResponseDto> {
    return this.videosService.bulkUpdateCategories(bulkUpdateCategoriesDto);
  }

  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a video's title, categories, or rating" })
  @ApiResponse({ status: HttpStatus.OK, type: UpdateVideoResponseDto })
  public async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVideoDto: UpdateVideoDto,
  ): Promise<UpdateVideoResponseDto> {
    const video = await this.videosService.update(id, updateVideoDto);
    return { ok: true, video };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('dislike')
  @ApiOperation({ summary: 'Toggle or explicitly set the disliked state of a video' })
  @ApiResponse({ status: HttpStatus.OK, type: ToggleDislikeResponseDto })
  public async toggleDislike(@Body() toggleDislikeDto: ToggleDislikeDto): Promise<ToggleDislikeResponseDto> {
    return this.videosService.toggleDislike(toggleDislikeDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('rating')
  @ApiOperation({ summary: 'Set the rating for a video' })
  @ApiResponse({ status: HttpStatus.OK, type: SetRatingResponseDto })
  public async setRating(@Body() setRatingDto: SetRatingDto): Promise<SetRatingResponseDto> {
    return this.videosService.setRating(setRatingDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a video and its underlying file' })
  @ApiResponse({ status: HttpStatus.OK, type: OkResponseDto })
  public async remove(@Param('id', ParseIntPipe) id: number): Promise<OkResponseDto> {
    return this.videosService.remove(id);
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('scan')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Scan the uploads directory for new video files' })
  @ApiResponse({ status: HttpStatus.OK, type: ScanResponseDto })
  public async scan(): Promise<ScanResponseDto> {
    return this.videosService.scan();
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('refresh-metadata')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-probe duration and size metadata for videos' })
  @ApiResponse({ status: HttpStatus.OK, type: RefreshMetadataResponseDto })
  public async refreshMetadata(
    @Body() refreshMetadataDto: RefreshMetadataDto,
  ): Promise<RefreshMetadataResponseDto> {
    return this.videosService.refreshMetadata(refreshMetadataDto);
  }
}
