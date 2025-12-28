import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EnrollmentService } from '../services/enrollment.service';
import { BookEnrollmentDto } from '../dto/book-enrollment.dto';
import { RegisterCashEnrollmentDto } from '../dto/register-cash-enrollment.dto';
import { EnrollmentIdParamDto } from '../dto/enrollment-id-param.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Enrollment } from '../entities/enrollment.entity';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @Post('book')
  @ApiOperation({
    summary: 'Book enrollment for a session',
    description: 'Automatically uses package credits (FIFO) or wallet payment',
  })
  @ApiResponse({
    status: 201,
    description: 'Enrollment created successfully',
  })
  async bookEnrollment(
    @Body() dto: BookEnrollmentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.bookEnrollment(dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.enrollment' },
    });
  }

  @Post('register-cash')
  @Permissions(PERMISSIONS.SESSIONS.UPDATE) // Staff permission for cash handling
  @ApiOperation({
    summary: 'Register cash payment at session door (Staff Only)',
    description: 'Takes cash payment and creates immediate PAID enrollment. Price auto-fetched from session.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cash enrollment created successfully',
  })
  async registerCashEnrollment(
    @Body() dto: RegisterCashEnrollmentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.registerCashEnrollment(dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.cashEnrollment' },
    });
  }

  @Post(':enrollmentId/check-in')
  @Permissions(PERMISSIONS.STAFF.UPDATE) // Staff permission to mark attendance
  @ApiOperation({ summary: 'Mark enrollment as attended (confirm attendance)' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment marked as attended',
  })
  async checkIn(
    @Param() params: EnrollmentIdParamDto,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.markAsAttended(params.enrollmentId);

    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.enrollment' },
    });
  }

  @Post(':enrollmentId/no-show')
  @Permissions(PERMISSIONS.STAFF.UPDATE) // Staff permission to mark no-show
  @ApiOperation({
    summary: 'Mark enrollment as no-show (revenue protection)',
    description: 'Consumes credits/money - prevents students from booking and not showing up'
  })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment marked as no-show',
  })
  async markNoShow(
    @Param() params: EnrollmentIdParamDto,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.markAsNoShow(params.enrollmentId);

    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.enrollment' },
    });
  }

  @Post(':enrollmentId/cancel')
  @ApiOperation({
    summary: 'Cancel enrollment (before 2 hours)',
    description: 'Restores credits/funds if cancelled early enough'
  })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment cancelled successfully',
  })
  async cancelEnrollment(
    @Param() params: EnrollmentIdParamDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.cancelEnrollment(params.enrollmentId, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.enrollment' },
    });
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get student enrollment history',
    description: 'Shows all past and current enrollments for the student'
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment history retrieved successfully',
  })
  async getEnrollmentHistory(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Enrollment[]>> {
    const result = await this.enrollmentService.getStudentEnrollmentHistory(
      actor.userProfileId,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.enrollmentHistory' },
    });
  }

  @Get(':enrollmentId')
  @ApiOperation({ summary: 'Get enrollment details' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment retrieved successfully',
  })
  async getEnrollment(
    @Param() params: EnrollmentIdParamDto,
  ): Promise<ControllerResponse<Enrollment>> {
    const result = await this.enrollmentService.getEnrollment(params.enrollmentId);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.enrollment' },
    });
  }
}
