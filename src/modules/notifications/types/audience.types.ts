/**
 * Audience identifier for multi-audience notifications
 * Each notification type can have different audiences (e.g., ADMIN, OWNER, STAFF)
 * with different channels and configurations
 */
export type AudienceId = string;

/**
 * Known audience identifiers
 * Extend this enum as needed for new audiences
 */
export enum KnownAudience {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
}


