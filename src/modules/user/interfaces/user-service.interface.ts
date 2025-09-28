import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { UpdateUserRequestDto } from '../dto/update-user.dto';
import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { User } from '../entities/user.entity';

export interface UserListQuery {
  query: PaginationQuery;
  userId: string;
  centerId?: string;
  targetUserId?: string; // used for accessible users
  targetCenterId?: string; // used for accessible users
}

export interface CreateUserParams {
  dto: CreateUserRequestDto;
  currentUserId: string;
}

export interface UpdateUserParams {
  userId: string;
  dto: UpdateUserRequestDto;
  currentUserId: string;
}

export interface ChangePasswordParams {
  userId: string;
  dto: ChangePasswordRequestDto;
}

export interface ToggleUserStatusParams {
  userId: string;
  isActive: boolean;
  currentUserId: string;
}

export interface DeleteUserParams {
  userId: string;
  currentUserId: string;
}

export interface RestoreUserParams {
  userId: string;
  currentUserId: string;
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

export interface HandleUserCenterAccessParams {
  userId: string;
  dto: CreateUserRequestDto;
  currentUserId: string;
}

export interface ActivateUserParams {
  userId: string;
  data: { isActive: boolean };
  currentUserId: string;
}

export interface UserServiceResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface UserListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}

export interface UserCenterInfo {
  id: string;
  name: string;
  accessType: string;
  isActive: boolean;
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
  centers: UserCenterInfo[];
  context?: any;
  isAdmin: boolean;
}
