import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class PaginateSessionRosterDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by attendance status',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
