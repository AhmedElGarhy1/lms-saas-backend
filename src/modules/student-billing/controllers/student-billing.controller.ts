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
import { CreateMonthlySubscriptionDto } from '../dto/create-monthly-subscription.dto';
import { CreateSessionChargeDto } from '../dto/create-session-charge.dto';
import { StudentClassSubscription } from '../entities/student-class-subscription.entity';
import { StudentSessionCharge } from '../entities/student-session-charge.entity';
import { StudentBillingRecord } from '../entities/student-billing-record.entity';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { GetUser } from '@/shared/common/decorators';

@Controller('billing/students')
export class StudentBillingController {
  constructor(private readonly billingService: StudentBillingService) {}

  @Post('subscriptions')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createMonthlySubscription(
    @Body() dto: CreateMonthlySubscriptionDto,
  ): Promise<ControllerResponse<StudentClassSubscription>> {
    const subscription =
      await this.billingService.createMonthlySubscription(dto);
    return ControllerResponse.success(subscription, {
      key: 't.messages.created',
      args: { resource: 't.resources.subscription' },
    });
  }

  @Post('session-charges')
  @Transactional()
  @HttpCode(HttpStatus.CREATED)
  async createSessionCharge(
    @Body() dto: CreateSessionChargeDto,
  ): Promise<ControllerResponse<StudentSessionCharge>> {
    const charge = await this.billingService.createSessionCharge(dto);
    return ControllerResponse.success(charge, {
      key: 't.messages.created',
      args: { resource: 't.resources.sessionCharge' },
    });
  }

  @Get('records')
  async getStudentBillingRecords(
    @Query() paginateDto: PaginateStudentBillingRecordsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<StudentBillingRecord>>> {
    const records = await this.billingService.getStudentBillingRecords(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(records, {
      key: 't.messages.found',
      args: { resource: 't.resources.billingRecords' },
    });
  }
}
