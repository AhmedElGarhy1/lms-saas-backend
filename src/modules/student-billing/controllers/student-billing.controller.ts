import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { StudentBillingService } from '../services/student-billing.service';
import { StudentBillingRefundService } from '../services/student-billing-refund.service';
import { CreateStudentChargeDto } from '../dto/create-student-charge.dto';
import { RefundStudentBillingDto } from '../dto/refund-student-billing.dto';
import { PayClassInstallmentDto } from '../dto/pay-class-installment.dto';
import { PaymentSource } from '../entities/student-charge.entity';
import { StudentCharge } from '../entities/student-charge.entity';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';

@ManagerialOnly()
@Controller('billing/students')
export class StudentBillingController {
  constructor(
    private readonly billingService: StudentBillingService,
    private readonly billingRefundService: StudentBillingRefundService,
  ) {}

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('charge/cash')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createCashCharge(
    @Body() dto: CreateStudentChargeDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const result = await this.billingService.createStudentCharge(
      dto,
      PaymentSource.CASH,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('charge/wallet')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createWalletCharge(
    @Body() dto: CreateStudentChargeDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const result = await this.billingService.createStudentCharge(
      dto,
      PaymentSource.WALLET,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_RECORDS)
  @Get('records')
  async getStudentBillingRecords(
    @Query() paginateDto: PaginateStudentBillingRecordsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<StudentCharge>>> {
    const records = await this.billingService.getStudentBillingRecords(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(records);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_RECORDS)
  @Get('records/:id')
  async getStudentBillingRecordById(
    @Param('id') id: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const record = await this.billingService.getStudentBillingRecordById(
      id,
      actor,
    );

    return ControllerResponse.success(record);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.REFUND_BILLING)
  @Post('records/:id/refund')
  @HttpCode(HttpStatus.OK)
  async refundStudentBilling(
    @Param('id') billingRecordId: string,
    @Body() dto: RefundStudentBillingDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const result = await this.billingRefundService.refundStudentBilling(
      billingRecordId,
      dto.reason,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('classes/pay-installment/cash')
  @Transactional()
  @HttpCode(HttpStatus.OK)
  async payClassInstallmentCash(
    @Body() dto: PayClassInstallmentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const result = await this.billingService.payClassInstallment(
      dto.classId,
      dto.studentUserProfileId,
      dto.amount,
      PaymentSource.CASH,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('classes/pay-installment/wallet')
  @Transactional()
  @HttpCode(HttpStatus.OK)
  async payClassInstallmentWallet(
    @Body() dto: PayClassInstallmentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentCharge>> {
    const result = await this.billingService.payClassInstallment(
      dto.classId,
      dto.studentUserProfileId,
      dto.amount,
      PaymentSource.WALLET,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_RECORDS)
  @Get('classes/:classId/students/:studentUserProfileId/progress')
  async getClassChargeProgress(
    @Param('classId') classId: string,
    @Param('studentUserProfileId') studentUserProfileId: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<any>> {
    const result = await this.billingService.getClassChargeProgress(
      studentUserProfileId,
      classId,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_RECORDS)
  @Get('students/:studentUserProfileId/progress/summary')
  async getStudentBillingSummary(
    @Param('studentUserProfileId') studentUserProfileId: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<any>> {
    const result = await this.billingService.getStudentBillingSummary(
      studentUserProfileId,
      actor,
    );
    return ControllerResponse.success(result);
  }
}
