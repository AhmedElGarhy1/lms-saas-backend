import { ExportMapper } from '../services/export.service';
import { Center } from '@/modules/centers/entities/center.entity';

export interface CenterExportData {
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
}

export class CenterExportMapper
  implements ExportMapper<Center, CenterExportData>
{
  mapToExport(center: Center): CenterExportData {
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
    ];
  }
}
