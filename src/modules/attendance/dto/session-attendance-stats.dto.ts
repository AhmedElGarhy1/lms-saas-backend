import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SessionAttendanceStatsDto {
  @ApiProperty({ description: 'Session ID' })
  @Expose()
  sessionId: string;

  @ApiProperty({ description: 'Group ID' })
  @Expose()
  groupId: string;

  @ApiProperty({ description: 'Total active students in roster' })
  @Expose()
  totalStudents: number;

  @ApiProperty({ description: 'Count of PRESENT attendance records' })
  @Expose()
  present: number;

  @ApiProperty({ description: 'Count of LATE attendance records' })
  @Expose()
  late: number;

  @ApiProperty({ description: 'Count of EXCUSED attendance records' })
  @Expose()
  excused: number;

  @ApiProperty({
    description: 'Count of students with no attendance record yet (unscanned)',
  })
  @Expose()
  absent: number;
}
