import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateSessionRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  teacherId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  grade: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  recurrenceRule: z.string().optional(),
  isCancelled: z.boolean().optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

export class UpdateSessionRequestDto {
  @ApiPropertyOptional({ description: 'Session title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Session description' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Teacher ID',
    type: String,
    format: 'uuid',
  })
  teacherId?: string;

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

  @ApiPropertyOptional({
    description: 'Session start time',
    type: String,
    format: 'date-time',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time',
    type: String,
    format: 'date-time',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule (e.g., weekly, iCal RRULE)',
  })
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Is session cancelled', default: false })
  isCancelled?: boolean;
}
