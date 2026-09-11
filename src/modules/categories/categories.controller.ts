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
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import {
  CategoryOperationResponseDto,
  ReorderCategoriesResponseDto,
} from './dto/category-operation-response.dto';
import { CategorySummaryResponseDto, CategoryVideoPathMap } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  public constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get a map of category name to the relative paths of its videos' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
  })
  public async getCategoryVideoPathMap(): Promise<CategoryVideoPathMap> {
    return this.categoriesService.getCategoryVideoPathMap();
  }

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'Get the full category list with per-category video counts' })
  @ApiResponse({ status: HttpStatus.OK, type: [CategorySummaryResponseDto] })
  public async getFullCategoryList(): Promise<CategorySummaryResponseDto[]> {
    return this.categoriesService.getFullCategoryList();
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder categories by supplying their ids in the desired order' })
  @ApiResponse({ status: HttpStatus.OK, type: ReorderCategoriesResponseDto })
  public async reorder(
    @Body() reorderCategoriesDto: ReorderCategoriesDto,
  ): Promise<ReorderCategoriesResponseDto> {
    const ids = await this.categoriesService.reorder(reorderCategoriesDto.ids);
    return { ok: true, ids };
  }

  @Roles('ADMIN')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: HttpStatus.CREATED, type: CategoryOperationResponseDto })
  public async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<{ ok: true; category: Category }> {
    const category = await this.categoriesService.create(createCategoryDto);
    return { ok: true, category };
  }

  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a category's name or color" })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryOperationResponseDto })
  public async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<{ ok: true; category: Category }> {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return { ok: true, category };
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: HttpStatus.OK, type: OkResponseDto })
  public async remove(@Param('id', ParseIntPipe) id: number): Promise<OkResponseDto> {
    await this.categoriesService.remove(id);
    return { ok: true };
  }
}
