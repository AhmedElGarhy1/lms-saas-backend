import { ExportMapper } from '../services/export.service';
import { Role } from '@/modules/access-control/entities/role.entity';

export interface RoleExportData {
  id: string;
  name: string;
  description: string;
  readOnly: boolean;
  createdAt: string;
  updatedAt: string;
  centerId: string;
  centerName: string;
}

export class RoleExportMapper implements ExportMapper<Role, RoleExportData> {
  mapToExport(role: Role): RoleExportData {
    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      readOnly: role.readOnly,
      createdAt: role.createdAt?.toISOString() || '',
      updatedAt: role.updatedAt?.toISOString() || '',
      centerId: role.centerId || '',
      centerName: role.center?.name || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Description',
      'Read Only',
      'Created At',
      'Updated At',
      'Center ID',
      'Center Name',
    ];
  }
}
