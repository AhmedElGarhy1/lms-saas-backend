import { ExportMapper } from '../services/export.service';
import { User } from '@/modules/user/entities/user.entity';

export interface UserExportData {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  profileType: string;
  failedLoginAttempts: number;
}

export class UserExportMapper implements ExportMapper<User, UserExportData> {
  mapToExport(user: User): UserExportData {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt?.toISOString() || '',
      updatedAt: user.updatedAt?.toISOString() || '',
      profileType: user.profile?.type || '',
      failedLoginAttempts: user.failedLoginAttempts,
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
      'Profile Type',
      'Failed Login Attempts',
    ];
  }
}
