import {
  Injectable,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RolesService } from './roles.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PermissionService } from './permission.service';
import { PermissionScope, ALL_PERMISSIONS } from '../constants/permissions';
import { buildPermissionFromProfileType } from '../utils/profile-type-permission.util';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Base options for profile type permission validation
 */
interface BaseValidationOptions {
  /**
   * The user profile ID of the actor (person performing the action)
   */
  actorUserProfileId: string;

  /**
   * The user profile ID of the target (profile being operated on)
   * Used to fetch the profileType from database
   * Either targetUserProfileId OR profileType must be provided
   */
  targetUserProfileId?: string;

  /**
   * The profile type being operated on
   * Use this for create operations where profileType is in DTO
   * Either targetUserProfileId OR profileType must be provided
   */
  profileType?: ProfileType;

  /**
   * Optional center ID for scope validation
   */
  centerId?: string;
}

/**
 * Options for profile type permission validation
 * Supports both standard operations (create, update, etc.) and custom actions (grant-center-access, etc.)
 */
export interface ValidateProfileTypePermissionOptions
  extends BaseValidationOptions {
  /**
   * The operation or permission action being performed
   * Can be a standard operation: 'create' | 'update' | 'delete' | 'read' | 'restore' | 'activate'
   * Or a custom action: 'grant-center-access', 'grant-user-access', etc.
   */
  operation: string;

  /**
   * Permission naming pattern: 'prefix' (staff:create) or 'suffix' (create:staff)
   * Default: 'prefix'
   */
  permissionPattern?: 'prefix' | 'suffix';
}

@Injectable()
export class ProfileTypePermissionService {
  private readonly logger = new Logger(ProfileTypePermissionService.name);

  constructor(
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => UserProfileService))
    private readonly userProfileService: UserProfileService,
    private readonly permissionService: PermissionService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  /**
   * Validates that the actor has permission to perform the operation/action on the target profile type
   * Supports both standard operations (create, update, delete, etc.) and custom actions (grant-center-access, etc.)
   *
   * @param options - Validation options (must provide either targetUserProfileId OR profileType)
   * @throws ForbiddenException if actor doesn't have required permission
   * @throws ResourceNotFoundException if target profile not found (when using targetUserProfileId)
   * @throws ValidationFailedException if neither targetUserProfileId nor profileType provided
   *
   * @example
   * // Standard operation - profileType from DTO
   * await service.validateProfileTypePermission({
   *   actorUserProfileId: 'actor-profile-id',
   *   profileType: ProfileType.STAFF,
   *   operation: 'create',
   * });
   *
   * // Standard operation - profileType from target profile
   * await service.validateProfileTypePermission({
   *   actorUserProfileId: 'actor-profile-id',
   *   targetUserProfileId: 'target-profile-id',
   *   operation: 'update',
   * });
   *
   * // Custom action
   * await service.validateProfileTypePermission({
   *   actorUserProfileId: 'actor-profile-id',
   *   targetUserProfileId: 'granter-profile-id',
   *   operation: 'grant-center-access',
   *   centerId: 'center-id',
   * });
   */
  async validateProfileTypePermission(
    options: ValidateProfileTypePermissionOptions,
  ): Promise<void> {
    const profileType = await this.resolveProfileType(options);
    const requiredPermission = buildPermissionFromProfileType(
      profileType,
      options.operation,
      options.permissionPattern || 'prefix',
    );

    await this.validatePermission(
      options.actorUserProfileId,
      requiredPermission,
      profileType,
      options.operation,
      options.centerId,
    );
  }

  /**
   * Resolves the profile type from options (either provided directly or fetched from target profile)
   */
  private async resolveProfileType(
    options: BaseValidationOptions,
  ): Promise<ProfileType> {
    if (options.profileType) {
      return options.profileType;
    }

    if (options.targetUserProfileId) {
      const targetProfile = await this.userProfileService.findOne(
        options.targetUserProfileId,
      );

      if (!targetProfile) {
        throw new ResourceNotFoundException(
          this.i18n.translate('t.errors.userProfileNotFound'),
        );
      }

      return targetProfile.profileType;
    }

    throw new ValidationFailedException(
      this.i18n.translate(
        't.errors.eitherTargetUserProfileIdOrProfileTypeRequired' as any,
      ),
    );
  }

  /**
   * Core validation logic - checks if actor has the required permission
   */
  private async validatePermission(
    actorUserProfileId: string,
    requiredPermission: string,
    profileType: ProfileType,
    operationOrAction: string,
    centerId?: string,
  ): Promise<void> {
    const scope = await this.getScopeFromPermission(requiredPermission);

    const hasPermission = await this.rolesService.hasPermission(
      actorUserProfileId,
      requiredPermission,
      scope,
      centerId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${operationOrAction} ${profileType} profiles. ` +
          `Required permission: ${requiredPermission}`,
      );
    }
  }

  /**
   * Gets the scope from permission definition
   * First tries to get from PERMISSIONS constants (fast, no DB query)
   * Falls back to database lookup if not found in constants
   * Fails fast if permission doesn't exist (security: no guessing)
   *
   * TODO: Consider implementing caching or a more efficient lookup strategy
   * to avoid repeated database queries for the same permission action.
   * Current approach queries DB on every check if not found in constants.
   *
   * @param permissionAction - The permission action string (e.g., 'staff:create', 'staff:grant-center-access')
   * @returns The permission scope (ADMIN, CENTER, or BOTH)
   * @throws ForbiddenException if permission not found (fail fast for security)
   */
  private async getScopeFromPermission(
    permissionAction: string,
  ): Promise<PermissionScope> {
    // Try to get from constants first (fast, no DB query)
    const scopeFromConstants = this.getScopeFromConstants(permissionAction);
    if (scopeFromConstants) {
      return scopeFromConstants;
    }

    // Fallback to database lookup
    const permission =
      await this.permissionService.getPermissionByAction(permissionAction);

    if (!permission) {
      this.logger.error(
        `Permission '${permissionAction}' not found in constants or database. This is a configuration error.`,
      );
      throw new ForbiddenException(
        `Permission '${permissionAction}' is not configured. Please contact system administrator.`,
      );
    }

    return permission.scope;
  }

  /**
   * Gets scope from PERMISSIONS constants (fast lookup, no DB query)
   * Returns null if not found in constants
   */
  private getScopeFromConstants(
    permissionAction: string,
  ): PermissionScope | null {
    // Use the pre-flattened ALL_PERMISSIONS array from constants
    const permission = ALL_PERMISSIONS.find(
      (p) => p.action === permissionAction,
    );

    return permission?.scope || null;
  }
}
