import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Maps ProfileType enum values to permission prefixes
 * Example: ProfileType.STAFF → "staff", ProfileType.ADMIN → "admin"
 */
export const PROFILE_TYPE_TO_PERMISSION_PREFIX: Record<ProfileType, string> = {
  [ProfileType.STAFF]: 'staff',
  [ProfileType.ADMIN]: 'admin',
  [ProfileType.TEACHER]: 'teacher',
  [ProfileType.STUDENT]: 'student',
  [ProfileType.PARENT]: 'parent',
};

/**
 * Builds a permission string from profile type and operation
 *
 * @param profileType - The profile type (e.g., ProfileType.STAFF)
 * @param operation - The operation (e.g., 'create', 'update', 'delete', 'read')
 * @param pattern - Permission pattern: 'prefix' (staff:create) or 'suffix' (create:staff)
 * @returns Permission string (e.g., 'staff:create' or 'create:staff')
 *
 * @example
 * buildPermissionFromProfileType(ProfileType.STAFF, 'create', 'prefix')
 * // Returns: 'staff:create'
 *
 * buildPermissionFromProfileType(ProfileType.ADMIN, 'update', 'suffix')
 * // Returns: 'update:admin'
 */
export function buildPermissionFromProfileType(
  profileType: ProfileType,
  operation: string,
  pattern: 'prefix' | 'suffix' = 'prefix',
): string {
  const prefix = PROFILE_TYPE_TO_PERMISSION_PREFIX[profileType];

  if (!prefix) {
    throw new Error(`Unknown profile type: ${profileType}`);
  }

  return pattern === 'prefix'
    ? `${prefix}:${operation}`
    : `${operation}:${prefix}`;
}

/**
 * Extracts profile type from permission string
 *
 * @param permission - Permission string (e.g., 'staff:create')
 * @returns ProfileType if found, null otherwise
 *
 * @example
 * extractProfileTypeFromPermission('staff:create')
 * // Returns: ProfileType.STAFF
 */
export function extractProfileTypeFromPermission(
  permission: string,
): ProfileType | null {
  const prefix = permission.split(':')[0];
  const entry = Object.entries(PROFILE_TYPE_TO_PERMISSION_PREFIX).find(
    ([, value]) => value === prefix,
  );
  return entry ? (entry[0] as ProfileType) : null;
}
