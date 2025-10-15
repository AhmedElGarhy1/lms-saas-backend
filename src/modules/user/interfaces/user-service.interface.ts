import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';

export interface UserListQuery {
  query: PaginateUsersDto;
  centerId?: string;
  roleId?: string;
}

export interface ChangePasswordParams {
  userId: string;
  dto: ChangePasswordRequestDto;
  centerId?: string;
}

export interface UserServiceResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface CurrentUserProfileResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    phone?: string;
    address?: string;
    dateOfBirth?: Date;
  };
  context: {
    center?: Center;
    role: UserRole;
  };
  isAdmin: boolean;
}
