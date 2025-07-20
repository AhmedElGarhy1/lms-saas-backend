import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const SubjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  centerId: z.string(),
  gradeLevelId: z.string(),
  credits: z.number(),
  duration: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SubjectResponse = z.infer<typeof SubjectResponseSchema>;

export class SubjectResponseDto {
  @ApiProperty({ example: 'subject-uuid', description: 'Subject ID' })
  id: string;

  @ApiProperty({ example: 'Mathematics', description: 'Name of the subject' })
  name: string;

  @ApiProperty({
    example: 'Advanced mathematics for primary students',
    description: 'Description of the subject',
  })
  description: string;

  @ApiProperty({ example: 'center-uuid', description: 'Center ID' })
  centerId: string;

  @ApiProperty({ example: 'grade-uuid', description: 'Grade level ID' })
  gradeLevelId: string;

  @ApiProperty({ example: 4, description: 'Number of credits' })
  credits: number;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  duration: number;

  @ApiProperty({ example: true, description: 'Whether the subject is active' })
  isActive: boolean;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Creation date',
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Last update date',
  })
  updatedAt: string;
}
