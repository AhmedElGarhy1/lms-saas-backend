import { ExportMapper } from '../services/export.service';
import { Role } from '@/modules/access-control/entities/role.entity';

export interface RoleExportData {
  id: string;
  name: string;
  type: string;
  description: string;
  readOnly: boolean;
  createdAt: string;
  updatedAt: string;
  centerId: string;
  centerName: string;
  userCount: number;
}

export class RoleExportMapper implements ExportMapper<Role, RoleExportData> {
  mapToExport(role: Role): RoleExportData {
    return {
      id: role.id,
      name: role.name,
      type: role.type,
      description: role.description || '',
      readOnly: role.readOnly,
      createdAt: role.createdAt?.toISOString() || '',
      updatedAt: role.updatedAt?.toISOString() || '',
      centerId: role.centerId || '',
      centerName: role.center?.name || '',
      userCount: role.userRoles?.length || 0,
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Type',
      'Description',
      'Read Only',
      'Created At',
      'Updated At',
      'Center ID',
      'Center Name',
      'User Count',
    ];
  }
}
