import { ExportMapper } from '../services/export.service';
import { CenterResponseDto } from '@/modules/centers/dto/center-response.dto';

export interface CenterResponseExportData {
  id: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logo: string;
  createdByProfileId: string;
  isCenterAccessible: boolean;
}

export class CenterResponseExportMapper
  implements ExportMapper<CenterResponseDto, CenterResponseExportData>
{
  mapToExport(center: CenterResponseDto): CenterResponseExportData {
    return {
      id: center.id,
      name: center.name,
      description: center.description || '',
      phone: center.phone || '',
      email: center.email || '',
      website: center.website || '',
      isActive: center.isActive,
      createdAt: center.createdAt?.toISOString() || '',
      updatedAt: center.updatedAt?.toISOString() || '',
      logo: center.logo || '',
      createdByProfileId: center.createdByProfileId || '',
      isCenterAccessible: center.isCenterAccessible || false,
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Name',
      'Description',
      'Phone',
      'Email',
      'Website',
      'Is Active',
      'Created At',
      'Updated At',
      'Logo',
      'Created By Profile ID',
      'Is Center Accessible',
    ];
  }
}
