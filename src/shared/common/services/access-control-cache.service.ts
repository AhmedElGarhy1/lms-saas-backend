import { AsyncLocalStorage } from 'async_hooks';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { BranchAccess } from '@/modules/centers/entities/branch-access.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { ProfileType } from '../enums/profile-type.enum';

/**
 * Cache data for global roles (Layer 1)
 */
export interface RolesCacheData {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  profileType?: ProfileType;
}

/**
 * Cache data for center access (Layer 2)
 */
export interface CenterAccessCacheData {
  isOwner?: boolean;
  hasCenterAccess?: boolean;
  centerAccess?: CenterAccess | null;
}

/**
 * Cache data for branch access (Layer 3)
 */
export interface BranchAccessCacheData {
  hasBranchAccess?: boolean;
  branchAccess?: BranchAccess | null;
}

/**
 * Cache data for user access (Layer 4)
 */
export interface UserAccessCacheData {
  hasUserAccess?: boolean;
  userAccess?: UserAccess | null;
}

/**
 * Access control cache structure with layered Maps
 */
export interface AccessControlCache {
  roles: Map<string, RolesCacheData>;
  centerAccess: Map<string, CenterAccessCacheData>;
  branchAccess: Map<string, BranchAccessCacheData>;
  userAccess: Map<string, UserAccessCacheData>;
  batch: Map<string, Set<string>>;
}

/**
 * Service for managing request-scoped access control caching.
 * Uses AsyncLocalStorage to maintain cache per request lifecycle.
 *
 * Layer 1: Roles cache (global roles only)
 * Layer 2: Center access cache
 * Layer 3: Branch access cache
 * Layer 4: User access cache
 * Layer 5: Batch results cache (optional, use with caution)
 */
export class AccessControlCacheService {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<AccessControlCache>();

  /**
   * Initialize cache for current request.
   * Should be called in middleware after RequestContext setup.
   * Uses enterWith to set the cache for the current async context (request lifecycle).
   */
  static initialize(): void {
    const cache: AccessControlCache = {
      roles: new Map(),
      centerAccess: new Map(),
      branchAccess: new Map(),
      userAccess: new Map(),
      batch: new Map(),
    };
    // Use enterWith to set cache for current async context (request)
    // This is appropriate for middleware where we can't wrap in a callback
    this.asyncLocalStorage.enterWith(cache);
  }

  /**
   * Get the cache store for current request.
   * Returns undefined if not in request context (defensive fallback).
   */
  private static getStore(): AccessControlCache | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Helper: Convert roles tuple to string key
   */
  private static rolesKey(userProfileId: string): string {
    return `user:${userProfileId}`;
  }

  /**
   * Helper: Convert center access tuple to string key
   */
  private static centerAccessKey(
    userProfileId: string,
    centerId: string,
  ): string {
    return `center:${centerId}:user:${userProfileId}`;
  }

  /**
   * Helper: Convert branch access tuple to string key
   */
  private static branchAccessKey(
    userProfileId: string,
    centerId: string,
    branchId: string,
  ): string {
    return `branch:${branchId}:center:${centerId}:user:${userProfileId}`;
  }

  /**
   * Helper: Convert user access tuple to string key
   */
  private static userAccessKey(
    granterUserProfileId: string,
    targetUserProfileId: string,
    centerId: string | null,
  ): string {
    const centerIdPart = centerId ?? 'null';
    return `user:granter:${granterUserProfileId}:target:${targetUserProfileId}:center:${centerIdPart}`;
  }

  // ==================== Roles Cache (Layer 1) ====================

  /**
   * Get cached roles data for user.
   * Returns undefined if not cached or cache not available.
   */
  static getRoles(userProfileId: string): RolesCacheData | undefined {
    const cache = this.getStore();
    if (!cache) {
      return undefined;
    }
    const key = this.rolesKey(userProfileId);
    return cache.roles.get(key);
  }

  /**
   * Set cached roles data for user.
   * No-op if cache not available (defensive fallback).
   */
  static setRoles(userProfileId: string, data: RolesCacheData): void {
    const cache = this.getStore();
    if (!cache) {
      return;
    }
    const key = this.rolesKey(userProfileId);
    cache.roles.set(key, data);
  }

  // ==================== Center Access Cache (Layer 2) ====================

  /**
   * Get cached center access data.
   * Returns undefined if not cached or cache not available.
   */
  static getCenterAccess(
    userProfileId: string,
    centerId: string,
  ): CenterAccessCacheData | undefined {
    const cache = this.getStore();
    if (!cache) {
      return undefined;
    }
    const key = this.centerAccessKey(userProfileId, centerId);
    return cache.centerAccess.get(key);
  }

  /**
   * Set cached center access data.
   * No-op if cache not available (defensive fallback).
   */
  static setCenterAccess(
    userProfileId: string,
    centerId: string,
    data: CenterAccessCacheData,
  ): void {
    const cache = this.getStore();
    if (!cache) {
      return;
    }
    const key = this.centerAccessKey(userProfileId, centerId);
    cache.centerAccess.set(key, data);
  }

  // ==================== Branch Access Cache (Layer 3) ====================

  /**
   * Get cached branch access data.
   * Returns undefined if not cached or cache not available.
   */
  static getBranchAccess(
    userProfileId: string,
    centerId: string,
    branchId: string,
  ): BranchAccessCacheData | undefined {
    const cache = this.getStore();
    if (!cache) {
      return undefined;
    }
    const key = this.branchAccessKey(userProfileId, centerId, branchId);
    return cache.branchAccess.get(key);
  }

  /**
   * Set cached branch access data.
   * No-op if cache not available (defensive fallback).
   */
  static setBranchAccess(
    userProfileId: string,
    centerId: string,
    branchId: string,
    data: BranchAccessCacheData,
  ): void {
    const cache = this.getStore();
    if (!cache) {
      return;
    }
    const key = this.branchAccessKey(userProfileId, centerId, branchId);
    cache.branchAccess.set(key, data);
  }

  // ==================== User Access Cache (Layer 4) ====================

  /**
   * Get cached user access data.
   * Returns undefined if not cached or cache not available.
   */
  static getUserAccess(
    granterUserProfileId: string,
    targetUserProfileId: string,
    centerId: string | null,
  ): UserAccessCacheData | undefined {
    const cache = this.getStore();
    if (!cache) {
      return undefined;
    }
    const key = this.userAccessKey(
      granterUserProfileId,
      targetUserProfileId,
      centerId,
    );
    return cache.userAccess.get(key);
  }

  /**
   * Set cached user access data.
   * No-op if cache not available (defensive fallback).
   */
  static setUserAccess(
    granterUserProfileId: string,
    targetUserProfileId: string,
    centerId: string | null,
    data: UserAccessCacheData,
  ): void {
    const cache = this.getStore();
    if (!cache) {
      return;
    }
    const key = this.userAccessKey(
      granterUserProfileId,
      targetUserProfileId,
      centerId,
    );
    cache.userAccess.set(key, data);
  }

  // ==================== Batch Cache (Layer 5) ====================

  /**
   * Get cached batch result.
   * Returns undefined if not cached or cache not available.
   * Batch cache should only be used for small, deterministic inputs (<50 items).
   */
  static getBatchResult(key: string): Set<string> | undefined {
    const cache = this.getStore();
    if (!cache) {
      return undefined;
    }
    return cache.batch.get(key);
  }

  /**
   * Set cached batch result.
   * No-op if cache not available (defensive fallback).
   * Batch cache should only be used for small, deterministic inputs (<50 items).
   */
  static setBatchResult(key: string, value: Set<string>): void {
    const cache = this.getStore();
    if (!cache) {
      return;
    }
    cache.batch.set(key, value);
  }
}
