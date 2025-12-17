import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { SubjectsService } from '../services/subjects.service';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkDeleteSubjectsDto } from '../dto/bulk-delete-subjects.dto';
import { BulkRestoreSubjectsDto } from '../dto/bulk-restore-subjects.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiBearerAuth()
@ApiTags('Subjects Actions')
@Controller('subjects/actions')
export class SubjectsActionsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete subjects' })
  @ApiBody({ type: BulkDeleteSubjectsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.SUBJECTS.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteSubjectsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.subjectIds,
      async (subjectId: string) => {
        await this.subjectsService.deleteSubject(subjectId, actor);
        return { id: subjectId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.subject',
      },
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted subjects' })
  @ApiBody({ type: BulkRestoreSubjectsDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.SUBJECTS.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreSubjectsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.subjectIds,
      async (subjectId: string) => {
        await this.subjectsService.restoreSubject(subjectId, actor);
        return { id: subjectId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.subject',
      },
    });
  }
}
