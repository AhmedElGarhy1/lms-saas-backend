import { Class } from '../entities/class.entity';
import { ExportMapper } from '@/shared/common/services/export.service';
import { Level } from '@/modules/levels/entities/level.entity';
import { Subject } from '@/modules/subjects/entities/subject.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

export interface ClassExportData {
  id: string;
  name: string;
  levelName: string;
  subjectName: string;
  teacherName: string;
  branchName: string;
  startDate: string;
  endDate: string;
  duration: number;
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
      }
    }

    const level = classEntity.level as Level | undefined;
    const subject = classEntity.subject as Subject | undefined;
    const branch = classEntity.branch as Branch | undefined;

    return {
      id: classEntity.id,
      name: classEntity.name || '',
      levelName: level?.name || '',
      subjectName: subject?.name || '',
      teacherName: teacherName,
      branchName: branch?.location || '',
      startDate: classEntity.startDate?.toISOString() || '',
      endDate: classEntity.endDate?.toISOString() || '',
      duration: classEntity.duration || 0,
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
      'Duration (minutes)',
      'Student Payment Strategy',
      'Teacher Payment Strategy',
      'Created At',
      'Updated At',
    ];
  }
}
