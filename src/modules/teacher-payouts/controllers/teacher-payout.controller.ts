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
import { Money } from '@/shared/common/utils/money.util';
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
  ): Promise<ControllerResponse<any>> {
    // Get the payout record for this class
    const payout = await this.payoutService.getClassPayout(classId);

    if (!payout) {
      return ControllerResponse.success({
        totalAmount: 0,
        totalPaid: 0,
        remaining: 0,
        progress: 0,
        payoutType: null,
      });
    }

    const totalAmount = payout.unitPrice
      ? Money.from(payout.unitPrice)
      : Money.zero();
    const totalPaid = payout.totalPaid;
    const remaining = totalAmount.subtract(totalPaid);
    const progress = totalAmount.greaterThan(Money.zero())
      ? (totalPaid.toNumber() / totalAmount.toNumber()) * 100
      : 0;

    return ControllerResponse.success({
      totalAmount: totalAmount.toNumber(),
      totalPaid: totalPaid.toNumber(),
      remaining: remaining.toNumber(),
      progress,
      lastPayment: payout.lastPaymentAmount?.toNumber(), // Last installment amount
      payoutType: payout.unitType,
      payoutStatus: payout.status,
    });
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
      throw new Error(`No payout record found for class ${classId}`);
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
  ): Promise<ControllerResponse<any>> {
    const payouts =
      await this.payoutService.getTeacherPayoutsByTeacher(teacherId);

    const summary = {
      totalPayouts: payouts.length,
      totalAmount: Money.zero(),
      totalPaid: Money.zero(),
      totalRemaining: Money.zero(),
      overallProgress: 0,
      byType: {} as Record<string, any>,
    };

    for (const payout of payouts) {
      const totalAmount = payout.unitPrice
        ? Money.from(payout.unitPrice)
        : Money.zero();
      const totalPaid = payout.totalPaid;

      summary.totalAmount = summary.totalAmount.add(totalAmount);
      summary.totalPaid = summary.totalPaid.add(totalPaid);
      summary.totalRemaining = summary.totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );

      // Group by payout type
      const type = payout.unitType;
      if (!summary.byType[type]) {
        summary.byType[type] = {
          count: 0,
          totalAmount: Money.zero(),
          totalPaid: Money.zero(),
          totalRemaining: Money.zero(),
          progress: 0,
        };
      }

      summary.byType[type].count += 1;
      summary.byType[type].totalAmount =
        summary.byType[type].totalAmount.add(totalAmount);
      summary.byType[type].totalPaid =
        summary.byType[type].totalPaid.add(totalPaid);
      summary.byType[type].totalRemaining = summary.byType[
        type
      ].totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );
    }

    // Calculate overall progress
    summary.overallProgress = summary.totalAmount.greaterThan(Money.zero())
      ? (summary.totalPaid.toNumber() / summary.totalAmount.toNumber()) * 100
      : 0;

    // Convert Money objects to numbers for response
    const response = {
      ...summary,
      totalAmount: summary.totalAmount.toNumber(),
      totalPaid: summary.totalPaid.toNumber(),
      totalRemaining: summary.totalRemaining.toNumber(),
    };

    // Calculate progress by type
    for (const type of Object.keys(summary.byType)) {
      const typeData = summary.byType[type];
      typeData.totalAmount = typeData.totalAmount.toNumber();
      typeData.totalPaid = typeData.totalPaid.toNumber();
      typeData.totalRemaining = typeData.totalRemaining.toNumber();
      typeData.progress =
        typeData.totalAmount > 0
          ? (typeData.totalPaid / typeData.totalAmount) * 100
          : 0;
    }

    return ControllerResponse.success(response);
  }
}
