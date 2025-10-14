import { ExportMapper } from '../services/export.service';
import { ActivityLog } from '@/shared/modules/activity-log/entities/activity-log.entity';

export interface ActivityLogExportData {
  id: string;
  type: string;
  userId: string;
  userEmail: string;
  centerId: string;
  centerName: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  metadata: string;
}

export class ActivityLogExportMapper
  implements ExportMapper<ActivityLog, ActivityLogExportData>
{
  mapToExport(activityLog: ActivityLog): ActivityLogExportData {
    return {
      id: activityLog.id,
      type: activityLog.type,
      userId: activityLog.userId || '',
      userEmail: activityLog.user?.email || '',
      centerId: activityLog.centerId || '',
      centerName: activityLog.center?.name || '',
      ipAddress: activityLog.ipAddress || '',
      userAgent: activityLog.userAgent || '',
      createdAt: activityLog.createdAt?.toISOString() || '',
      metadata: JSON.stringify(activityLog.metadata || {}),
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Type',
      'User ID',
      'User Email',
      'Center ID',
      'Center Name',
      'IP Address',
      'User Agent',
      'Created At',
      'Metadata',
    ];
  }
}
