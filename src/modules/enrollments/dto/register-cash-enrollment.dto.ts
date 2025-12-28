import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCashEnrollmentDto {
  @ApiProperty({
    description: 'Session ID where the student is enrolling',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Student ID being enrolled',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  studentId: string;

  // ❌ No 'amount' field - prevents staff from setting custom prices
  // ❌ No 'branchId' field - service determines from session context
  // ✅ Price fetched automatically from session/class settings
  // ✅ Branch determined from session's group → branch relationship
}
