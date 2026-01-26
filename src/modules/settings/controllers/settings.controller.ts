import { Controller, Get, Patch, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dto/update-setting.dto';
import { Money } from '@/shared/common/utils/money.util';
import { Transactional } from '@nestjs-cls/transactional';
import { AdminOnly } from '@/shared/common/decorators';

@Controller('settings')
@ApiTags('Settings')
@AdminOnly()
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Retrieve all system settings as key-value pairs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  @Permissions(PERMISSIONS.SETTINGS.READ)
  async getSettings(): Promise<ControllerResponse<Record<string, string>>> {
    const settings = await this.settingsService.getAllSettings();
    return ControllerResponse.success(settings);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update settings',
    description:
      'Update system settings. Fees (percentage), maxDebit (amount), and maxNegativeBalance (amount) are required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  @Permissions(PERMISSIONS.SETTINGS.UPDATE)
  @Transactional()
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Record<string, string>>> {
    await this.settingsService.setFees(dto.fees);
    const maxDebitAmount = Money.from(dto.maxDebit);
    await this.settingsService.setMaxDebit(maxDebitAmount);
    const maxNegativeBalanceAmount = Money.from(dto.maxNegativeBalance);
    await this.settingsService.setMaxNegativeBalance(maxNegativeBalanceAmount);

    // Return updated settings
    const settings = await this.settingsService.getAllSettings();
    return ControllerResponse.success(settings);
  }
}
