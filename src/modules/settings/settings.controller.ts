import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/ok-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PlayerSettingsResponseDto } from './dto/player-settings-response.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  public constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get the default player settings' })
  @ApiResponse({ status: HttpStatus.OK, type: PlayerSettingsResponseDto })
  public async getSettings(): Promise<PlayerSettingsResponseDto> {
    return this.settingsService.getSettings();
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post()
  @ApiOperation({ summary: 'Update the default player settings' })
  @ApiResponse({ status: HttpStatus.OK, type: OkResponseDto })
  public async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto): Promise<OkResponseDto> {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
