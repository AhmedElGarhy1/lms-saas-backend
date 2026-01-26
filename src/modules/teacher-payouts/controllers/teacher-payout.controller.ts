import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeacherPayoutService } from '../services/teacher-payout.service';
import { PaginateTeacherPayoutsDto } from '../dto/paginate-teacher-payouts.dto';
import { UpdatePayoutStatusDto } from '../dto/update-payout-status.dto';
import { PayInstallmentDto } from '../dto/pay-installment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TeacherPayoutRecord } from '../entities/teacher-payout-record.entity';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TeacherPayoutErrors } from '../exceptions/teacher-payout.errors';
import { PayoutProgress, TeacherPayoutSummary } from '../interfaces/payout-progress.interface';

@ManagerialOnly()
@Controller('payouts/teachers')
export class TeacherPayoutController {
  constructor(private readonly payoutService: TeacherPayoutService) {}

  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.VIEW_PAYOUTS)
  @Get()
  async getTeacherPayouts(
    @Query() dto: PaginateTeacherPayoutsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<TeacherPayoutRecord>>> {
    const payouts = await this.payoutService.getTeacherPayouts(dto, actor);
    return ControllerResponse.success(payouts);
  }

  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.VIEW_PAYOUTS)
  @Get(':id')
  async getPayoutById(
    @Param('id') id: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<TeacherPayoutRecord>> {
    const payout = await this.payoutService.getPayoutById(id, actor);
    return ControllerResponse.success(payout);
  }

  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.UPDATE_PAYOUT_STATUS)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updatePayoutStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePayoutStatusDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<TeacherPayoutRecord>> {
    const payout = await this.payoutService.updatePayoutStatus(id, dto, actor);
    return ControllerResponse.success(payout);
  }

  // Get progress for CLASS payouts by class ID
  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.VIEW_PAYOUTS)
  @Get('classes/:classId/progress')
  async getClassPayoutProgress(
    @Param('classId') classId: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<PayoutProgress | null>> {
    const progress = await this.payoutService.getClassPayoutProgress(classId);
    return ControllerResponse.success(progress);
  }

  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.UPDATE_PAYOUT_STATUS)
  @Patch('classes/:classId/pay-installment')
  @HttpCode(HttpStatus.OK)
  async payClassInstallment(
    @Param('classId') classId: string,
    @Body() dto: PayInstallmentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<TeacherPayoutRecord>> {
    // Find the payout record for this class
    const payoutRecord = await this.payoutService.getClassPayout(classId);

    if (!payoutRecord) {
      throw TeacherPayoutErrors.payoutNotFoundForClass(classId);
    }

    const updatedPayout = await this.payoutService.payClassInstallment(
      payoutRecord.id,
      dto.amount,
      dto.paymentMethod,
      actor,
    );
    return ControllerResponse.success(updatedPayout);
  }

  // Get overall progress for all teacher's payouts
  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.VIEW_PAYOUTS)
  @Get(':teacherId/progress/summary')
  async getTeacherProgressSummary(
    @Param('teacherId') teacherId: string,
  ): Promise<ControllerResponse<TeacherPayoutSummary>> {
    const summary = await this.payoutService.getTeacherProgressSummary(
      teacherId,
    );
    return ControllerResponse.success(summary);
  }
}
