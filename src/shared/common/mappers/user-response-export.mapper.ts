import { ExportMapper } from '../services/export.service';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';

export interface UserResponseExportData {
  id: string;
  phone: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserResponseExportMapper
  implements ExportMapper<UserResponseDto, UserResponseExportData>
{
  mapToExport(user: UserResponseDto): UserResponseExportData {
    return {
      id: user.id,
      phone: user.phone || '',
      name: user.name || '',
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt?.toISOString() || '',
      updatedAt: user.updatedAt?.toISOString() || '',
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Phone',
      'Name',
      'Is Active',
      'Two Factor Enabled',
      'Created At',
      'Updated At',
      'Profile ID',
      'Is User Accessible',
      'Is Center Accessible',
      'Is Role Accessible',
    ];
  }
}
