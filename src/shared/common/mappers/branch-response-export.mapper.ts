import { ExportMapper } from '../services/export.service';
import { BranchResponseDto } from '@/modules/centers/dto/branch-response.dto';

export interface BranchResponseExportData {
  id: string;
  centerId: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  capacity: string;
  state: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  centerName: string;
}

export class BranchResponseExportMapper
  implements ExportMapper<BranchResponseDto, BranchResponseExportData>
{
  mapToExport(branch: BranchResponseDto): BranchResponseExportData {
    return {
      id: branch.id,
      centerId: branch.centerId,
      location: branch.location,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      website: branch.website || '',
      description: branch.description || '',
      capacity: branch.capacity?.toString() || '',
      state: branch.state || '',
      isActive: branch.isActive ? 'Yes' : 'No',
      createdAt: branch.createdAt?.toISOString() || '',
      updatedAt: branch.updatedAt?.toISOString() || '',
      createdBy: branch.createdBy || '',
      centerName: branch.center?.name || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Center ID',
      'Location',
      'Address',
      'Phone',
      'Email',
      'Website',
      'Description',
      'Capacity',
      'State',
      'Is Active',
      'Created At',
      'Updated At',
      'Created By',
      'Center Name',
    ];
  }
}
