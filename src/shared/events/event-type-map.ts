/**
 * Type Maps for Events
 *
 * Provides type safety for event emissions and listeners.
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */

import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
} from '@/modules/user/events/user.events';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
  TokenRefreshedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  TwoFactorSetupEvent,
  PasswordChangedEvent,
  EmailVerifiedEvent,
  UserLoginFailedEvent,
} from '@/modules/auth/events/auth.events';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RestoreRoleEvent,
} from '@/modules/access-control/events/role.events';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
  CreateCenterOwnerEvent,
  AssignCenterOwnerEvent,
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import {
  CreateAdminEvent,
  AdminCreatedEvent,
} from '@/modules/admin/events/admin.events';
import {
  CreateStaffEvent,
  StaffCreatedEvent,
} from '@/modules/staff/events/staff.events';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  RequestEmailVerificationEvent,
  RequestPhoneVerificationEvent,
  OtpEvent,
  PhoneVerifiedEvent,
} from '@/modules/auth/events/auth.events';

// Import event enums for type safety
import { UserEvents } from '@/shared/events/user.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RoleEvents } from '@/shared/events/role.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { StaffEvents } from '@/shared/events/staff.events.enum';

/**
 * Event Type Map
 * Maps event names to their event class types.
 * Events represent facts (what happened).
 *
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */
export type EventTypeMap = {
  // User Events
  [UserEvents.CREATED]: UserCreatedEvent;
  [UserEvents.UPDATED]: UserUpdatedEvent;
  [UserEvents.DELETED]: UserDeletedEvent;
  [UserEvents.RESTORED]: UserRestoredEvent;
  [UserEvents.ACTIVATED]: UserActivatedEvent;

  // Auth Events
  [AuthEvents.USER_LOGGED_IN]: UserLoggedInEvent;
  [AuthEvents.USER_LOGGED_OUT]: UserLoggedOutEvent;
  [AuthEvents.USER_LOGIN_FAILED]: UserLoginFailedEvent;
  [AuthEvents.TOKEN_REFRESHED]: TokenRefreshedEvent;
  [AuthEvents.PASSWORD_CHANGED]: PasswordChangedEvent;
  [AuthEvents.EMAIL_VERIFIED]: EmailVerifiedEvent;
  [AuthEvents.TWO_FA_SETUP]: TwoFactorSetupEvent;
  [AuthEvents.TWO_FA_ENABLED]: TwoFactorEnabledEvent;
  [AuthEvents.TWO_FA_DISABLED]: TwoFactorDisabledEvent;

  // Role Events
  [RoleEvents.CREATED]: CreateRoleEvent;
  [RoleEvents.UPDATED]: UpdateRoleEvent;
  [RoleEvents.DELETED]: DeleteRoleEvent;
  [RoleEvents.RESTORED]: RestoreRoleEvent;

  // Center Events
  [CenterEvents.CREATED]: CreateCenterEvent;
  [CenterEvents.UPDATED]: UpdateCenterEvent;
  [CenterEvents.DELETED]: DeleteCenterEvent;
  [CenterEvents.RESTORED]: RestoreCenterEvent;
  [CenterEvents.CREATE_OWNER]: CreateCenterOwnerEvent;
  [CenterEvents.ASSIGN_OWNER]: AssignCenterOwnerEvent;
  [CenterEvents.CREATE_BRANCH]: CreateCenterBranchEvent;

  // Branch Events
  [BranchEvents.CREATED]: BranchCreatedEvent;
  [BranchEvents.UPDATED]: BranchUpdatedEvent;
  [BranchEvents.DELETED]: BranchDeletedEvent;
  [BranchEvents.RESTORED]: BranchRestoredEvent;

  // AccessControl Events
  [AccessControlEvents.GRANT_CENTER_ACCESS]: GrantCenterAccessEvent;
  [AccessControlEvents.GRANT_USER_ACCESS]: GrantUserAccessEvent;
  [AccessControlEvents.ASSIGN_ROLE]: AssignRoleEvent;
  [AccessControlEvents.ACTIVATE_CENTER_ACCESS]: ActivateCenterAccessEvent;
  [AccessControlEvents.DEACTIVATE_CENTER_ACCESS]: DeactivateCenterAccessEvent;

  // Admin Events
  [AdminEvents.CREATE]: CreateAdminEvent;
  [AdminEvents.CREATED]: AdminCreatedEvent;

  // Staff Events
  [StaffEvents.CREATE]: CreateStaffEvent;
  [StaffEvents.CREATED]: StaffCreatedEvent;

  // Additional Auth Events
  [AuthEvents.PASSWORD_RESET_REQUESTED]: PasswordResetRequestedEvent;
  [AuthEvents.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedEvent;
  [AuthEvents.EMAIL_VERIFICATION_SEND_REQUESTED]: RequestEmailVerificationEvent;
  [AuthEvents.PHONE_VERIFICATION_SEND_REQUESTED]: RequestPhoneVerificationEvent;
  [AuthEvents.OTP]: OtpEvent;
  [AuthEvents.PHONE_VERIFIED]: PhoneVerifiedEvent;
};

/**
 * Helper type to extract event name from EventTypeMap
 */
export type EventName = keyof EventTypeMap;

/**
 * Helper type to extract payload type for a given event name
 */
export type EventPayload<T extends EventName> = EventTypeMap[T];
