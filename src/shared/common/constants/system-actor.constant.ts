import { ActorUser } from '../types/actor-user.type';
import { ProfileType } from '../enums/profile-type.enum';

/**
 * Fixed UUID for the system user.
 * This user represents all system/automated actions (cron jobs, background tasks, etc.)
 * The UUID is intentionally all zeros to make it easily identifiable.
 */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * System actor object representing automated system actions.
 * Used in cron jobs and background tasks where no real user is performing the action.
 * Note: This is a minimal ActorUser object. For full User entity properties, the system user
 * should be loaded from the database when needed.
 */
export const SYSTEM_ACTOR: ActorUser = {
  id: SYSTEM_USER_ID,
  userProfileId: SYSTEM_USER_ID, // System user doesn't have a separate profile
  profileType: null as unknown as ProfileType, // System actor doesn't have a profile type
  name: 'System User',
  phone: '01000000000',
  isActive: true,
  centerId: undefined, // Center ID should be provided per operation
  // Minimal User entity properties required by ActorUser type
  password: '', // Not used for system actor
  twoFactorEnabled: false,
  hashedRt: null,
  phoneVerified: null,
  verificationTokens: [],
  userProfiles: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: SYSTEM_USER_ID,
  updatedBy: undefined,
  deletedAt: undefined,
  deletedBy: undefined,
} as unknown as ActorUser;
