import { Group } from '@/modules/classes/entities/group.entity';
import { ExportMapper } from '@/shared/common/services/export.service';
import { Class } from '@/modules/classes/entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { calculateEndTime } from '@/modules/classes/utils/time-calculator.util';

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
  /**
   * Map group to export data.
   * This method matches the ExportMapper interface signature.
   * For proper functionality, use mapToExportWithContext instead.
   *
   * @param group - The group entity
   * @returns GroupExportData
   */
  mapToExport(group: Group): GroupExportData {
    // This method is kept for interface compatibility but should not be used directly
    // Use mapToExportWithContext instead
    return this.mapToExportWithContext(group, undefined, undefined);
  }

  /**
   * Map group to export data with class and branch entities.
   * This method accepts class and branch as parameters instead of relying on relations.
   *
   * @param group - The group entity
   * @param classEntity - Optional class entity (fetched separately)
   * @param branch - Optional branch entity (fetched separately)
   * @returns GroupExportData
   */
  mapToExportWithContext(
    group: Group,
    classEntity?: Class,
    branch?: Branch,
  ): GroupExportData {
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

    // Get student count from computed field if available, otherwise from relation (for backward compatibility)

    const studentsCount =
      (group as any).studentsCount ?? group.groupStudents?.length ?? 0;

    return {
      id: group.id,
      name: group.name || '',
      className: classEntity?.name || '',
      branchName: branch?.location || '',
      studentCount: studentsCount,
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


