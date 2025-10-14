import { ExportMapper } from '../services/export.service';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';

export interface RoleResponseExportData {
  id: string;
  name: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  centerId: string;
  isRoleAccessible: boolean;
  createdBy: string;
  updatedBy: string;
}

export class RoleResponseExportMapper
  implements ExportMapper<RoleResponseDto, RoleResponseExportData>
{
  mapToExport(role: RoleResponseDto): RoleResponseExportData {
    return {
      id: role.id,
      name: role.name,
      type: role.type,
      description: role.description || '',
      createdAt: role.createdAt?.toISOString() || '',
      updatedAt: role.updatedAt?.toISOString() || '',
      centerId: role.centerId || '',
      isRoleAccessible: role.isRoleAccessible || false,
      createdBy: role.createdBy || '',
      updatedBy: role.updatedBy || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Type',
      'Description',
      'Created At',
      'Updated At',
      'Center ID',
      'Is Role Accessible',
      'Created By',
      'Updated By',
    ];
  }
}
