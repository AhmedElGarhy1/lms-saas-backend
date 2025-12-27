import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { IsProfileCode } from '@/shared/common/decorators';

export class ScanAttendanceDto {
  @ApiProperty({ description: 'Real session UUID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Student code (e.g. STU-25-000001)' })
  @IsString()
  @IsProfileCode({ allowedPrefixes: ['STU'] })
  studentCode: string;
}
