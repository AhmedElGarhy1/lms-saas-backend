import { SetMetadata } from '@nestjs/common';

export const STUDENT_ONLY_KEY = 'studentOnly';

export const StudentOnly = () => SetMetadata(STUDENT_ONLY_KEY, true);
