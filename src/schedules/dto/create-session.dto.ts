import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateSessionRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  teacherId: z.string().uuid(),
  centerId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  grade: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceRule: z.string().optional(),
  isCancelled: z.boolean().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export class CreateSessionRequestDto {
  @ApiProperty({ description: 'Session title' })
  title: string;

  @ApiPropertyOptional({ description: 'Session description' })
  description?: string;

  @ApiProperty({ description: 'Teacher ID', type: String, format: 'uuid' })
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Center ID',
    type: String,
    format: 'uuid',
  })
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Group ID',
    type: String,
    format: 'uuid',
  })
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Subject ID',
    type: String,
    format: 'uuid',
  })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Grade (if no group)' })
  grade?: string;

  @ApiProperty({
    description: 'Session start time',
    type: String,
    format: 'date-time',
  })
  startTime: string;

  @ApiProperty({
    description: 'Session end time',
    type: String,
    format: 'date-time',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule (e.g., weekly, iCal RRULE)',
  })
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Is session cancelled', default: false })
  isCancelled?: boolean;
}
