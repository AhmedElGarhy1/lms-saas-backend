import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ProfileType, StudentGrade } from '@prisma/client';

// Base profile schema
const BaseProfileSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  avatar: z.string().optional(),
});

// Teacher profile schema
const TeacherProfileSchema = BaseProfileSchema.extend({
  type: z.literal(ProfileType.TEACHER),
  biography: z.string().optional(),
  experienceYears: z.number().int().positive().optional(),
  specialization: z.string().optional(),
});

// Student profile schema
const StudentProfileSchema = BaseProfileSchema.extend({
  type: z.literal(ProfileType.STUDENT),
  grade: z.nativeEnum(StudentGrade),
  level: z.string().optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  gradeLevelId: z.string().optional(),
});

// Guardian profile schema
const GuardianProfileSchema = BaseProfileSchema.extend({
  type: z.literal(ProfileType.GUARDIAN),
  emergencyContact: z.string().optional(),
  relationship: z.string().optional(),
});

// Union of all profile types
const CreateProfileSchema = z.union([
  TeacherProfileSchema,
  StudentProfileSchema,
  GuardianProfileSchema,
]);

export class CreateProfileDto extends createZodDto(CreateProfileSchema) {}
