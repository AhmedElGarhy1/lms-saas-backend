import { ExportMapper } from '../services/export.service';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';

export interface RoleResponseExportData {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  centerId: string;
  createdByProfileId: string;
  updatedByProfileId: string;
}

export class RoleResponseExportMapper
  implements ExportMapper<RoleResponseDto, RoleResponseExportData>
{
  mapToExport(role: RoleResponseDto): RoleResponseExportData {
    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      createdAt: role.createdAt?.toISOString() || '',
      updatedAt: role.updatedAt?.toISOString() || '',
      centerId: role.centerId || '',
      createdByProfileId: role.createdByProfileId || '',
      updatedByProfileId: role.updatedByProfileId || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Description',
      'Created At',
      'Updated At',
      'Center ID',
      'Created By Profile ID',
      'Updated By Profile ID',
    ];
  }
}
