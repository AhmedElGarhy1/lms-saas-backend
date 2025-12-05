import { Group } from '../entities/group.entity';
import { ExportMapper } from '@/shared/common/services/export.service';
import { Class } from '../entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

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
    // Format schedule summary
    const scheduleSummary =
      group.scheduleItems && group.scheduleItems.length > 0
        ? group.scheduleItems
            .map((item) => `${item.day} ${item.startTime}-${item.endTime}`)
            .join(', ')
        : '';

    const classEntity = group.class as Class | undefined;
    const branch = group.branch as Branch | undefined;

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
