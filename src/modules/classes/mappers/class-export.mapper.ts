import { Class } from '../entities/class.entity';
import { ExportMapper } from '@/shared/common/services/export.service';

export interface ClassExportData {
  id: string;
  name: string;
  levelName: string;
  subjectName: string;
  teacherName: string;
  branchName: string;
  startDate: string;
  endDate: string;
  studentPaymentStrategy: string;
  teacherPaymentStrategy: string;
  createdAt: string;
  updatedAt: string;
}

export class ClassExportMapper implements ExportMapper<Class, ClassExportData> {
  mapToExport(classEntity: Class): ClassExportData {
    // Get teacher name from user profile
    let teacherName = '';
    if (classEntity.teacher) {
      // If teacher relation is loaded with user, use it
      if ('user' in classEntity.teacher && classEntity.teacher.user) {
        teacherName =
          classEntity.teacher.user.name || classEntity.teacher.user.phone || '';
      } else {
        // Fallback to userProfile name if available
        teacherName = (classEntity.teacher as any).name || '';
      }
    }

    return {
      id: classEntity.id,
      name: classEntity.name || '',
      levelName: (classEntity.level as any)?.name || '',
      subjectName: (classEntity.subject as any)?.name || '',
      teacherName: teacherName,
      branchName: (classEntity.branch as any)?.name || '',
      startDate: classEntity.startDate?.toISOString() || '',
      endDate: classEntity.endDate?.toISOString() || '',
      studentPaymentStrategy: classEntity.studentPaymentStrategy
        ? JSON.stringify({
            per: classEntity.studentPaymentStrategy.per,
            count: classEntity.studentPaymentStrategy.count,
            amount: Number(classEntity.studentPaymentStrategy.amount),
          })
        : '',
      teacherPaymentStrategy: classEntity.teacherPaymentStrategy
        ? JSON.stringify({
            per: classEntity.teacherPaymentStrategy.per,
            amount: Number(classEntity.teacherPaymentStrategy.amount),
          })
        : '',
      createdAt: classEntity.createdAt?.toISOString() || '',
      updatedAt: classEntity.updatedAt?.toISOString() || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Level Name',
      'Subject Name',
      'Teacher Name',
      'Branch Name',
      'Start Date',
      'End Date',
      'Student Payment Strategy',
      'Teacher Payment Strategy',
      'Created At',
      'Updated At',
    ];
  }
}
