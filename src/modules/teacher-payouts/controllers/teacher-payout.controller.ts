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
  ): Promise<ControllerResponse<TeacherPayoutRecord>> {
    const payout = await this.payoutService.getPayoutById(id);
    return ControllerResponse.success(payout);
  }

  @Permissions(PERMISSIONS.TEACHER_PAYOUTS.UPDATE_PAYOUT_STATUS)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updatePayoutStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePayoutStatusDto,
  ): Promise<ControllerResponse<TeacherPayoutRecord>> {
    const payout = await this.payoutService.updatePayoutStatus(id, dto);
    return ControllerResponse.success(payout);
  }
}
