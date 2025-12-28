import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/enrollment.entity';

export class BookEnrollmentDto {
  @ApiProperty({
    description: 'Session ID to enroll in',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Student ID (optional, defaults to current user)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({
    description: 'Preferred payment method (optional, will auto-select based on available credits)',
    example: PaymentMethod.PACKAGE,
    required: false,
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate enrollments',
    example: 'enrollment-123456789',
    required: false,
  })
  @IsOptional()
  idempotencyKey?: string;
}
