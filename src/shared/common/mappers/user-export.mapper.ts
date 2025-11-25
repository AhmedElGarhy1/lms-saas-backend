import { ExportMapper } from '../services/export.service';
import { User } from '@/modules/user/entities/user.entity';

export interface UserExportData {
  id: string;
  phone: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  profileType: string;
}

export class UserExportMapper implements ExportMapper<User, UserExportData> {
  mapToExport(user: User): UserExportData {
    return {
      id: user.id,
      phone: user.phone || '',
      name: user.name,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt?.toISOString() || '',
      updatedAt: user.updatedAt?.toISOString() || '',
      profileType:
        user.userProfiles?.map((p) => p.profileType).join(', ') || '',
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
      'Profile Type',
      'Failed Login Attempts',
    ];
  }
}
