import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Group Response Schema
export const GroupResponseSchema = z.object({
  id: z.string().describe('Group ID'),
  name: z.string().describe('Group name'),
  description: z.string().optional().describe('Group description'),
  centerId: z.string().describe('Center ID'),
  gradeLevelId: z.string().optional().describe('Grade level ID'),
  maxStudents: z.number().optional().describe('Maximum number of students'),
  isActive: z.boolean().describe('Group active status'),
  createdAt: z.date().describe('Group creation timestamp'),
  updatedAt: z.date().describe('Group last update timestamp'),
});

// Group List Response Schema
export const GroupListResponseSchema = z.object({
  groups: z.array(GroupResponseSchema).describe('List of groups'),
  total: z.number().describe('Total number of groups'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Group Students Response Schema
export const GroupStudentsResponseSchema = z.object({
  students: z
    .array(
      z.object({
        id: z.string().describe('Student ID'),
        name: z.string().describe('Student name'),
        email: z.string().email().describe('Student email'),
        grade: z.string().describe('Student grade'),
      }),
    )
    .describe('List of students in the group'),
  total: z.number().describe('Total number of students'),
});

// Group Teachers Response Schema
export const GroupTeachersResponseSchema = z.object({
  teachers: z
    .array(
      z.object({
        id: z.string().describe('Teacher ID'),
        name: z.string().describe('Teacher name'),
        email: z.string().email().describe('Teacher email'),
        specialization: z
          .string()
          .optional()
          .describe('Teacher specialization'),
      }),
    )
    .describe('List of teachers in the group'),
  total: z.number().describe('Total number of teachers'),
});

// Create Group Response Schema
export const CreateGroupResponseSchema = z.object({
  message: z.string().describe('Success message'),
  group: GroupResponseSchema.describe('Created group information'),
});

// Update Group Response Schema
export const UpdateGroupResponseSchema = z.object({
  message: z.string().describe('Success message'),
  group: GroupResponseSchema.describe('Updated group information'),
});

// Assign Student Response Schema
export const AssignStudentResponseSchema = z.object({
  message: z.string().describe('Success message'),
  student: z
    .object({
      id: z.string().describe('Student ID'),
      name: z.string().describe('Student name'),
      email: z.string().email().describe('Student email'),
    })
    .describe('Assigned student information'),
});

// Assign Teacher Response Schema
export const AssignTeacherResponseSchema = z.object({
  message: z.string().describe('Success message'),
  teacher: z
    .object({
      id: z.string().describe('Teacher ID'),
      name: z.string().describe('Teacher name'),
      email: z.string().email().describe('Teacher email'),
    })
    .describe('Assigned teacher information'),
});

// Create DTOs using nestjs-zod
export class GroupResponseDto extends createZodDto(GroupResponseSchema) {}
export class GroupListResponseDto extends createZodDto(
  GroupListResponseSchema,
) {}
export class GroupStudentsResponseDto extends createZodDto(
  GroupStudentsResponseSchema,
) {}
export class GroupTeachersResponseDto extends createZodDto(
  GroupTeachersResponseSchema,
) {}
export class CreateGroupResponseDto extends createZodDto(
  CreateGroupResponseSchema,
) {}
export class UpdateGroupResponseDto extends createZodDto(
  UpdateGroupResponseSchema,
) {}
export class AssignStudentResponseDto extends createZodDto(
  AssignStudentResponseSchema,
) {}
export class AssignTeacherResponseDto extends createZodDto(
  AssignTeacherResponseSchema,
) {}
