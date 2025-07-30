import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../shared/services/logger.service';

interface CacheData {
  roles: string[];
  permissions: string[];
  timestamp: number;
}

interface CenterCacheData {
  users: string[];
  permissions: string[];
  timestamp: number;
}

interface ActivityStatsData {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByLevel: Record<string, number>;
  timestamp: number;
}

@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<string, CacheData>();
  private readonly centerCache = new Map<string, CenterCacheData>();
  private readonly activityStatsCache = new Map<string, ActivityStatsData>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  generateCacheKey(userId: string): string {
    return `user_permissions:${userId}`;
  }

  generateCenterCacheKey(centerId: string): string {
    return `center_data:${centerId}`;
  }

  generateActivityStatsCacheKey(centerId?: string): string {
    return centerId ? `activity_stats:${centerId}` : 'activity_stats:global';
  }

  getUserPermissions(userId: string): string[] | null {
    const cacheKey = this.generateCacheKey(userId);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValid(cached)) {
      return cached.permissions;
    }

    return null;
  }

  setUserPermissions(userId: string, permissions: string[]): void {
    const cacheKey = this.generateCacheKey(userId);
    this.cache.set(cacheKey, {
      permissions,
      roles: [], // We'll populate this if needed
      timestamp: Date.now(),
    });
  }

  getUserRoles(userId: string): string[] | null {
    const cacheKey = this.generateCacheKey(userId);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValid(cached)) {
      return cached.roles;
    }

    return null;
  }

  setUserRoles(userId: string, roles: string[]): void {
    const cacheKey = this.generateCacheKey(userId);
    const existing = this.cache.get(cacheKey);

    this.cache.set(cacheKey, {
      permissions: existing?.permissions || [],
      roles,
      timestamp: Date.now(),
    });
  }

  setUserData(
    userId: string,
    data: { permissions: string[]; roles: string[] },
  ): void {
    const cacheKey = this.generateCacheKey(userId);
    this.cache.set(cacheKey, {
      permissions: data.permissions,
      roles: data.roles,
      timestamp: Date.now(),
    });
  }

  invalidateUserCache(userId: string): void {
    const cacheKey = this.generateCacheKey(userId);
    this.cache.delete(cacheKey);
  }

  // Center-specific caching
  getCenterData(centerId: string): CenterCacheData | null {
    const cacheKey = this.generateCenterCacheKey(centerId);
    const cached = this.centerCache.get(cacheKey);

    if (cached && this.isValid(cached)) {
      return cached;
    }

    return null;
  }

  setCenterData(centerId: string, data: CenterCacheData): void {
    const cacheKey = this.generateCenterCacheKey(centerId);
    this.centerCache.set(cacheKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  invalidateCenterCache(centerId: string): void {
    const cacheKey = this.generateCenterCacheKey(centerId);
    this.centerCache.delete(cacheKey);
  }

  // Activity stats caching
  getActivityStats(centerId?: string): ActivityStatsData | null {
    const cacheKey = this.generateActivityStatsCacheKey(centerId);
    const cached = this.activityStatsCache.get(cacheKey);

    if (cached && this.isValid(cached)) {
      return cached;
    }

    return null;
  }

  setActivityStats(
    centerId: string | undefined,
    data: ActivityStatsData,
  ): void {
    const cacheKey = this.generateActivityStatsCacheKey(centerId);
    this.activityStatsCache.set(cacheKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  invalidateActivityStatsCache(centerId?: string): void {
    const cacheKey = this.generateActivityStatsCacheKey(centerId);
    this.activityStatsCache.delete(cacheKey);
  }

  // Global cache management
  clearAllCaches(): void {
    this.cache.clear();
    this.centerCache.clear();
    this.activityStatsCache.clear();
  }

  getCacheStats(): {
    userCacheSize: number;
    centerCacheSize: number;
    activityStatsCacheSize: number;
  } {
    return {
      userCacheSize: this.cache.size,
      centerCacheSize: this.centerCache.size,
      activityStatsCacheSize: this.activityStatsCache.size,
    };
  }

  private isValid(
    cached: CacheData | CenterCacheData | ActivityStatsData,
  ): boolean {
    return Date.now() - cached.timestamp < this.TTL;
  }
}
