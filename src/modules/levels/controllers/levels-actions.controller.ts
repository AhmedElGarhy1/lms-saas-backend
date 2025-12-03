import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { LevelsService } from '../services/levels.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkDeleteLevelsDto } from '../dto/bulk-delete-levels.dto';
import { BulkRestoreLevelsDto } from '../dto/bulk-restore-levels.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiBearerAuth()
@ApiTags('Levels Actions')
@Controller('levels/actions')
export class LevelsActionsController {
  constructor(
    private readonly levelsService: LevelsService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete levels' })
  @ApiBody({ type: BulkDeleteLevelsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.LEVELS.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteLevelsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.levelIds,
      async (levelId: string) => {
        await this.levelsService.deleteLevel(levelId, actor);
        return { id: levelId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkDelete', {
      resource: 't.common.resources.level',
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted levels' })
  @ApiBody({ type: BulkRestoreLevelsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.LEVELS.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreLevelsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.levelIds,
      async (levelId: string) => {
        await this.levelsService.restoreLevel(levelId, actor);
        return { id: levelId };
      },
    );

    return ControllerResponse.success(result, 't.success.bulkRestore', {
      resource: 't.common.resources.level',
    });
  }
}

