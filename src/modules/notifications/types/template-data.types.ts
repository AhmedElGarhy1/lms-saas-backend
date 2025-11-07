import { NotificationType } from '../enums/notification-type.enum';

/**
 * Base template data structure
 */
interface BaseTemplateData {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  link?: string;
  title?: string;
  expiresIn?: string;
  [key: string]: unknown;
}

/**
 * Template data for user-related notifications
 */
export interface UserTemplateData extends BaseTemplateData {
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isActive?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Template data for center-related notifications
 */
export interface CenterTemplateData extends BaseTemplateData {
  center?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    isActive?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Template data for branch-related notifications
 */
export interface BranchTemplateData extends BaseTemplateData {
  branch?: {
    id: string;
    name: string;
    centerId?: string;
    centerName?: string;
    address?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

/**
 * Template data for authentication-related notifications
 */
export interface AuthTemplateData extends BaseTemplateData {
  token?: string;
  resetUrl?: string;
  otp?: string;
  expiresAt?: Date;
}

/**
 * Template data for actor information (who performed the action)
 */
export interface ActorTemplateData extends BaseTemplateData {
  actor?: {
    id: string;
    name: string;
    email?: string;
    profileType?: string;
    [key: string]: unknown;
  };
}

/**
 * Union type for all template data structures
 * This allows type-safe template rendering based on notification type
 */
export type NotificationTemplateData =
  | UserTemplateData
  | CenterTemplateData
  | BranchTemplateData
  | AuthTemplateData
  | ActorTemplateData
  | BaseTemplateData;

/**
 * Type guard to check if data contains user information
 */
export function hasUserData(
  data: NotificationTemplateData,
): data is UserTemplateData {
  return 'user' in data && typeof data.user === 'object' && data.user !== null;
}

/**
 * Type guard to check if data contains center information
 */
export function hasCenterData(
  data: NotificationTemplateData,
): data is CenterTemplateData {
  return (
    'center' in data && typeof data.center === 'object' && data.center !== null
  );
}

/**
 * Type guard to check if data contains branch information
 */
export function hasBranchData(
  data: NotificationTemplateData,
): data is BranchTemplateData {
  return (
    'branch' in data && typeof data.branch === 'object' && data.branch !== null
  );
}

/**
 * Type guard to check if data contains actor information
 */
export function hasActorData(
  data: NotificationTemplateData,
): data is ActorTemplateData {
  return (
    'actor' in data && typeof data.actor === 'object' && data.actor !== null
  );
}
