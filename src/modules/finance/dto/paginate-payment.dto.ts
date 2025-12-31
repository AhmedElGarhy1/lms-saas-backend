import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentSource } from '../enums/payment-source.enum';

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
    enum: PaymentSource,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;

  @ApiProperty({
    description: 'Filter by sender ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  senderId?: string;
}

