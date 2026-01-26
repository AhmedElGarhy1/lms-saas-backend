import { IsUUID, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { Money } from '@/shared/common/utils/money.util';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';

export class CreatePayoutDto {
  @ApiProperty({
    description: 'Teacher user profile ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  teacherUserProfileId: string;

  @ApiProperty({
    description: 'Unit type for payment calculation',
    enum: TeacherPaymentUnit,
    example: TeacherPaymentUnit.SESSION,
  })
  @IsEnum(TeacherPaymentUnit)
  unitType: TeacherPaymentUnit;

  @ApiProperty({
    description: 'Total amount for CLASS payouts',
    example: 500.0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiProperty({
    description: 'Number of units',
    example: 2.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitCount: number;

  @ApiProperty({
    description: 'Class ID (required)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  classId: string;

  @ApiProperty({
    description: 'Session ID (optional, for session-specific payouts)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({
    description: 'Month (optional, for monthly payouts)',
    example: 12,
    minimum: 1,
    maximum: 12,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Min(12)
  month?: number;

  @ApiProperty({
    description: 'Year (optional, for monthly payouts)',
    example: 2024,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty({
    description:
      'Branch ID (optional, will be resolved from teacher if not provided)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description:
      'Center ID (optional, will be resolved from teacher if not provided)',
    example: '550e8400-e29b-41d4-a716-446655440004',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  centerId: string;

  @ApiProperty({
    description: 'Total paid amount (optional)',
    example: '0.00',
    required: false,
  })
  @IsOptional()
  totalPaid?: Money;

  @ApiProperty({
    description: 'Last payment amount (optional)',
    example: '100.00',
    required: false,
  })
  @IsOptional()
  lastPaymentAmount?: Money;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate payouts',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
