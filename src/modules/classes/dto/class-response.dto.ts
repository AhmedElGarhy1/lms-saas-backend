import { ApiProperty } from '@nestjs/swagger';
import {
  TeacherPaymentStrategy,
  StudentPaymentStrategy,
} from '../interfaces/payment-strategy.interface';

export class ClassResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  levelId: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  teacherUserProfileId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  centerId: string;

  @ApiProperty()
  studentPaymentStrategy: StudentPaymentStrategy;

  @ApiProperty()
  teacherPaymentStrategy: TeacherPaymentStrategy;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({
    description: 'Class duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  level?: any;

  @ApiProperty({ required: false })
  subject?: any;

  @ApiProperty({ required: false })
  teacher?: any;

  @ApiProperty({ required: false })
  branch?: any;

  @ApiProperty({ required: false })
  center?: any;
}
