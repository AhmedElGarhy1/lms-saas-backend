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
import { CreateStudentChargeDto } from '../dto/create-student-charge.dto';
import { CreateClassChargeDto } from '../dto/create-class-charge.dto';
import { PaymentSource } from '../entities/student-class-subscription.entity';
import { StudentClassSubscription } from '../entities/student-class-subscription.entity';
import { StudentSessionCharge } from '../entities/student-session-charge.entity';
import { StudentClassCharge } from '../entities/student-class-charge.entity';
import { StudentBillingRecord } from '../entities/student-billing-record.entity';
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
  constructor(private readonly billingService: StudentBillingService) {}

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('charge/cash')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createCashCharge(
    @Body() dto: CreateStudentChargeDto,
  ): Promise<
    ControllerResponse<
      StudentClassSubscription | StudentSessionCharge | StudentClassCharge
    >
  > {
    const result = await this.billingService.createStudentCharge(
      dto,
      PaymentSource.CASH,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('charge/wallet')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createWalletCharge(
    @Body() dto: CreateStudentChargeDto,
  ): Promise<
    ControllerResponse<
      StudentClassSubscription | StudentSessionCharge | StudentClassCharge
    >
  > {
    const result = await this.billingService.createStudentCharge(
      dto,
      PaymentSource.WALLET,
    );
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('classes/:classId/charges/cash')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createClassChargeCash(
    @Param('classId') classId: string,
    @Body() dto: CreateClassChargeDto,
  ): Promise<ControllerResponse<StudentClassCharge>> {
    dto.classId = classId; // Override with path param
    const result = await this.billingService.createClassCharge(dto);
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_CHARGE)
  @Post('classes/:classId/charges/wallet')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createClassChargeWallet(
    @Param('classId') classId: string,
    @Body() dto: CreateClassChargeDto,
  ): Promise<ControllerResponse<StudentClassCharge>> {
    dto.classId = classId; // Override with path param
    const result = await this.billingService.createClassCharge(dto);
    return ControllerResponse.success(result);
  }

  @Permissions(PERMISSIONS.STUDENT_BILLING.VIEW_STUDENT_RECORDS)
  @Get('records')
  async getStudentBillingRecords(
    @Query() paginateDto: PaginateStudentBillingRecordsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<StudentBillingRecord>>> {
    const records = await this.billingService.getStudentBillingRecords(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(records);
  }
}
