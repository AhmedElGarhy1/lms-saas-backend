import { PermissionScope } from '@/modules/access-control/constants/permissions';
import { SetMetadata } from '@nestjs/common';

export const SCOPE_KEY = 'scope';
export const Scope = (scope: PermissionScope) => SetMetadata(SCOPE_KEY, scope);
