import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SessionResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  teacherId: z.string(),
  centerId: z.string().optional(),
  groupId: z.string().optional(),
  subjectId: z.string().optional(),
  grade: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceRule: z.string().optional(),
  isCancelled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  teacher: z.any().optional(),
  center: z.any().optional(),
  group: z.any().optional(),
  subject: z.any().optional(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  teacherId: string;

  @ApiPropertyOptional()
  centerId?: string;

  @ApiPropertyOptional()
  groupId?: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional()
  grade?: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional()
  recurrenceRule?: string;

  @ApiProperty()
  isCancelled: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: Object })
  teacher?: any;

  @ApiPropertyOptional({ type: Object })
  center?: any;

  @ApiPropertyOptional({ type: Object })
  group?: any;

  @ApiPropertyOptional({ type: Object })
  subject?: any;
}
