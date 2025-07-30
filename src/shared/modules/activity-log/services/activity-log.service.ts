import { Injectable } from '@nestjs/common';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import {
  ActivityLog,
  ActivityType,
  ActivityLevel,
  ActivityScope,
} from '../entities/activity-log.entity';
import { LoggerService } from 'src/shared/services/logger.service';

export interface CreateActivityLogDto {
  type: ActivityType;
  level?: ActivityLevel;
  scope: ActivityScope;
  action: string;
  description?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  actorId?: string;
  targetUserId?: string;
  centerId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly logger: LoggerService,
  ) {}

  async createActivityLog(dto: CreateActivityLogDto): Promise<ActivityLog> {
    try {
      const activityLog = await this.activityLogRepository.create({
        type: dto.type,
        level: dto.level || ActivityLevel.INFO,
        scope: dto.scope,
        action: dto.action,
        description: dto.description,
        details: dto.details,
        metadata: dto.metadata,
        actorId: dto.actorId,
        targetUserId: dto.targetUserId,
        centerId: dto.centerId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      });

      this.logger.info(
        `Activity logged: ${dto.type} - ${dto.action}`,
        undefined,
        {
          activityId: activityLog.id,
          actorId: dto.actorId,
          centerId: dto.centerId,
          scope: dto.scope,
        },
      );

      return activityLog;
    } catch (error) {
      this.logger.error('Failed to create activity log', undefined, {
        error: error.message,
        dto,
      } as any);
      throw error;
    }
  }

  async logUserActivity(
    type: ActivityType,
    action: string,
    actorId: string,
    targetUserId?: string,
    details?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      scope: ActivityScope.USER,
      action,
      description: this.getActivityDescription(type, action),
      details,
      metadata,
      actorId,
      targetUserId,
    });
  }

  async logCenterActivity(
    type: ActivityType,
    action: string,
    actorId: string,
    centerId: string,
    targetUserId?: string,
    details?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      scope: ActivityScope.CENTER,
      action,
      description: this.getActivityDescription(type, action),
      details,
      metadata,
      actorId,
      targetUserId,
      centerId,
    });
  }

  async logGlobalActivity(
    type: ActivityType,
    action: string,
    actorId: string,
    details?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      scope: ActivityScope.GLOBAL,
      action,
      description: this.getActivityDescription(type, action),
      details,
      metadata,
      actorId,
    });
  }

  async logSystemActivity(
    type: ActivityType,
    action: string,
    level: ActivityLevel = ActivityLevel.INFO,
    details?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      level,
      scope: ActivityScope.GLOBAL,
      action,
      description: this.getActivityDescription(type, action),
      details,
      metadata,
    });
  }

  async getActivityLogsByCenter(
    centerId: string,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityLogRepository.findActivityLogsByCenter(centerId, query);
  }

  async getActivityLogsByUser(
    userId: string,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityLogRepository.findActivityLogsByUser(userId, query);
  }

  async getGlobalActivityLogs(
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityLogRepository.findGlobalActivityLogs(query);
  }

  async getActivityLogsByType(
    type: ActivityType,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityLogRepository.findActivityLogsByType(type, query);
  }

  async getActivityLogsByLevel(
    level: ActivityLevel,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityLogRepository.findActivityLogsByLevel(level, query);
  }

  async getActivityStats(centerId?: string): Promise<{
    total: number;
    byType: Record<ActivityType, number>;
    byLevel: Record<ActivityLevel, number>;
    byScope: Record<ActivityScope, number>;
    recentActivity: number;
  }> {
    return this.activityLogRepository.getActivityStats(centerId);
  }

  async getActivityLogById(id: string): Promise<ActivityLog | null> {
    return this.activityLogRepository.findOne(id);
  }

  private getActivityDescription(type: ActivityType, action: string): string {
    const descriptions: Record<ActivityType, string> = {
      // User activities
      [ActivityType.USER_CREATED]: 'User account created',
      [ActivityType.USER_UPDATED]: 'User account updated',
      [ActivityType.USER_DELETED]: 'User account deleted',
      [ActivityType.USER_ACTIVATED]: 'User account activated',
      [ActivityType.USER_DEACTIVATED]: 'User account deactivated',
      [ActivityType.USER_LOGIN]: 'User logged in',
      [ActivityType.USER_LOGOUT]: 'User logged out',
      [ActivityType.USER_PASSWORD_CHANGED]: 'User password changed',
      [ActivityType.USER_PROFILE_CREATED]: 'User profile created',
      [ActivityType.USER_PROFILE_UPDATED]: 'User profile updated',

      // Center activities
      [ActivityType.CENTER_CREATED]: 'Center created',
      [ActivityType.CENTER_UPDATED]: 'Center updated',
      [ActivityType.CENTER_DELETED]: 'Center deleted',
      [ActivityType.CENTER_ACTIVATED]: 'Center activated',
      [ActivityType.CENTER_DEACTIVATED]: 'Center deactivated',
      [ActivityType.CENTER_ADMIN_CREATED]: 'Center admin created',
      [ActivityType.CENTER_ADMIN_ASSIGNED]: 'Center admin assigned',
      [ActivityType.CENTER_ADMIN_REMOVED]: 'Center admin removed',
      [ActivityType.CENTER_USER_ASSIGNED]: 'User assigned to center',
      [ActivityType.CENTER_USER_REMOVED]: 'User removed from center',

      // Role activities
      [ActivityType.ROLE_CREATED]: 'Role created',
      [ActivityType.ROLE_UPDATED]: 'Role updated',
      [ActivityType.ROLE_DELETED]: 'Role deleted',
      [ActivityType.ROLE_ASSIGNED]: 'Role assigned to user',
      [ActivityType.ROLE_REMOVED]: 'Role removed from user',
      [ActivityType.ROLE_PERMISSIONS_UPDATED]: 'Role permissions updated',

      // Permission activities
      [ActivityType.PERMISSION_GRANTED]: 'Permission granted',
      [ActivityType.PERMISSION_REVOKED]: 'Permission revoked',

      // Access control activities
      [ActivityType.USER_ACCESS_GRANTED]: 'User access granted',
      [ActivityType.USER_ACCESS_REVOKED]: 'User access revoked',
      [ActivityType.CENTER_ACCESS_GRANTED]: 'Center access granted',
      [ActivityType.CENTER_ACCESS_REVOKED]: 'Center access revoked',

      // System activities
      [ActivityType.SYSTEM_BACKUP]: 'System backup performed',
      [ActivityType.SYSTEM_RESTORE]: 'System restore performed',
      [ActivityType.SYSTEM_MAINTENANCE]: 'System maintenance performed',
      [ActivityType.SYSTEM_ERROR]: 'System error occurred',
    };

    return descriptions[type] || action;
  }
}
