import { SetMetadata } from '@nestjs/common';

export const TEACHER_ONLY_KEY = 'teacherOnly';

export const TeacherOnly = () => SetMetadata(TEACHER_ONLY_KEY, true);
