import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StudentService } from '../services/student.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExportService } from '@/shared/common/services/export.service';
import { UserResponseExportMapper } from '@/shared/common/mappers/user-response-export.mapper';
import { ExportUsersDto } from '@/modules/user/dto/export-users.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { StudentEvents } from '@/shared/events/student.events.enum';
import { StudentExportedEvent } from '../events/student.events';

@ApiTags('Student Actions')
@Controller('students/actions')
export class StudentActionsController {
  constructor(
    private readonly studentService: StudentService,
    private readonly exportService: ExportService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  // ===== EXPORT FUNCTIONALITY =====
  @Get('export')
  @ApiOperation({ summary: 'Export student data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.STUDENT.EXPORT)
  async exportStudents(
    @Query() query: ExportUsersDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    const format = query.format;

    // Get data using student pagination logic
    const paginationResult = await this.studentService.paginateStudents(
      query,
      actor,
    );
    const users = paginationResult.items;

    // Create mapper
    const mapper = new UserResponseExportMapper();

    // Generate base filename
    const baseFilename = query.filename || 'students';

    // Use the simplified export method
    const data = await this.exportService.exportData(
      users,
      mapper,
      format,
      baseFilename,
      res,
    );

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      StudentEvents.EXPORTED,
      new StudentExportedEvent(format, baseFilename, users.length, query, actor),
    );

    return data;
  }
}

