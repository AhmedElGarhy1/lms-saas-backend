import { SetMetadata } from '@nestjs/common';
import { ScopeType } from './scope.decorator';
import { IPermission } from '@/modules/access-control/constants/permissions';

export interface PermissionsMetadata {
  permission: string;
  scope: ScopeType;
}

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = <
  T extends IPermission,
  S extends T['scope'] extends 'BOTH' ? ScopeType : T['scope'] = T['scope'],
>(
  permission: T,
  scope?: S,
) =>
  SetMetadata(PERMISSIONS_KEY, {
    permission: permission.action,
    scope: scope ?? permission.scope,
  } as PermissionsMetadata);
