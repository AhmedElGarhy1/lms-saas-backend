import { SetMetadata } from '@nestjs/common';

export enum ScopeType {
  ADMIN = 'ADMIN',
  CENTER = 'CENTER',
}

export const SCOPE_KEY = 'scope';
export const Scope = (scope: ScopeType) => SetMetadata(SCOPE_KEY, scope);
