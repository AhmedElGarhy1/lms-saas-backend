import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { Transform } from 'class-transformer';

export class PaginatePaymentDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({
    description: 'Filter by payment reason',
    enum: PaymentReason,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentReason)
  reason?: PaymentReason;

  @ApiProperty({
    description: 'Filter by payment source',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  source?: PaymentMethod;
}
