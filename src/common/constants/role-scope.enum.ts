export enum ScopeEnum {
  ADMIN = 'ADMIN', // Admin scope for admin operations
  CENTER = 'CENTER', // Center-specific scope
}

export const SCOPE_DESCRIPTIONS = {
  [ScopeEnum.ADMIN]: 'Admin scope for admin operations across all centers',
  [ScopeEnum.CENTER]:
    'Center-specific scope for operations within a specific center',
};

export const SCOPE_HEADERS = {
  SCOPE: 'x-scope',
  CENTER_ID: 'x-center-id',
} as const;
