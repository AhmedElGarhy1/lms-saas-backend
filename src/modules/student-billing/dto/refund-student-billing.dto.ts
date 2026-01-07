import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundStudentBillingDto {
  @ApiPropertyOptional({
    description: 'Reason for the refund request (optional)',
    example: 'Student cancelled before attending any sessions',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
