import { ScopeEnum } from '@/shared/common/constants/role-scope.enum';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  scope: ScopeEnum;
  centerId?: string;
  permissions: string[];
}
