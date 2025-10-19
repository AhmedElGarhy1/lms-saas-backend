import { ExportMapper } from '../services/export.service';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';

export interface UserResponseExportData {
  id: string;
  email: string;
  phone: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  profileId: string;
  isUserAccessible: boolean;
  isCenterAccessible: boolean;
  isRoleAccessible: boolean;
}

export class UserResponseExportMapper
  implements ExportMapper<UserResponseDto, UserResponseExportData>
{
  mapToExport(user: UserResponseDto): UserResponseExportData {
    return {
      id: user.id,
      email: user.email || '',
      phone: user.phone || '',
      name: user.name || '',
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt?.toISOString() || '',
      updatedAt: user.updatedAt?.toISOString() || '',
      profileId: user.profileId || '',
      isUserAccessible: user.isUserAccessible || false,
      isCenterAccessible: user.isCenterAccessible || false,
      isRoleAccessible: user.isRoleAccessible || false,
    };
  }

  getHeaders(): string[] {
    return [
      'ID',
      'Email',
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
