import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateUserRequestDto } from '../dto/update-user.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { User } from '../entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserRole } from '@/modules/access-control/entities';

export interface UserListQuery {
  query: PaginationQuery;
  userId: string;
  centerId?: string;
  targetUserId?: string; // used for accessible users
  targetCenterId?: string; // used for accessible users
}

export interface ChangePasswordParams {
  userId: string;
  dto: ChangePasswordRequestDto;
}

export interface GetProfileParams {
  userId: string;
  centerId?: string;
  currentUserId?: string;
}

export interface GetCurrentUserProfileParams {
  userId: string;
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
