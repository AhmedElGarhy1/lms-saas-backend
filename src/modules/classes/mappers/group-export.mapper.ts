import { Group } from '../entities/group.entity';
import { ExportMapper } from '@/shared/common/services/export.service';
import { Class } from '../entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { calculateEndTime } from '../utils/time-calculator.util';

export interface GroupExportData {
  id: string;
  name: string;
  className: string;
  branchName: string;
  studentCount: number;
  scheduleSummary: string;
  createdAt: string;
  updatedAt: string;
}

export class GroupExportMapper implements ExportMapper<Group, GroupExportData> {
  mapToExport(group: Group): GroupExportData {
    const classEntity = group.class as Class | undefined;
    const branch = group.branch as Branch | undefined;

    // Format schedule summary - calculate endTime from startTime + duration
    const scheduleSummary =
      group.scheduleItems &&
      group.scheduleItems.length > 0 &&
      classEntity?.duration
        ? group.scheduleItems
            .map((item) => {
              const endTime = calculateEndTime(
                item.startTime,
                classEntity.duration,
              );
              return `${item.day} ${item.startTime}-${endTime}`;
            })
            .join(', ')
        : '';

    return {
      id: group.id,
      name: group.name || '',
      className: classEntity?.name || '',
      branchName: branch?.location || '',
      studentCount: group.groupStudents?.length || 0,
      scheduleSummary: scheduleSummary,
      createdAt: group.createdAt?.toISOString() || '',
      updatedAt: group.updatedAt?.toISOString() || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Class Name',
      'Branch Name',
      'Student Count',
      'Schedule Summary',
      'Created At',
      'Updated At',
    ];
  }
}
