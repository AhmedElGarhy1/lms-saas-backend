import { ApiProperty } from '@nestjs/swagger';

export class PackageSummaryDto {
  @ApiProperty({
    description: 'Class ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  classId: string;

  @ApiProperty({
    description: 'Class name',
    example: 'Mathematics',
  })
  className: string;

  @ApiProperty({
    description: 'Subject name',
    example: 'Mathematics',
  })
  subjectName: string;

  @ApiProperty({
    description: 'Branch name',
    example: 'Main Branch',
  })
  branchName: string;

  @ApiProperty({
    description: 'Center name',
    example: 'Learning Center',
  })
  centerName: string;

  @ApiProperty({
    description: 'Total available sessions',
    example: 12,
  })
  totalAvailable: number;
}

