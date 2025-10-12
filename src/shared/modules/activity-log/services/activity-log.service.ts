import { Injectable, Logger } from '@nestjs/common';
import { ActivityLog, ActivityType } from '../entities/activity-log.entity';
import { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { RequestContext } from '@/shared/common/context/request.context';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async createActivityLog(dto: CreateActivityLogDto): Promise<ActivityLog> {
    try {
      // Get current request context for automatic actor and center ID assignment
      const requestContext = RequestContext.get();

      // Auto-assign actorId and centerId from context if not provided
      const actorId =
        dto.actorId !== undefined ? dto.actorId : requestContext?.userId;
      const centerId =
        dto.centerId !== undefined ? dto.centerId : requestContext?.centerId;

      // For IP address and user agent, we'll need to get them from the interceptor
      // since the request context doesn't store the full request object
      const ipAddress = dto.ipAddress;
      const userAgent = dto.userAgent;

      const activityLog = await this.activityLogRepository.create({
        type: dto.type,
        description: dto.description,
        metadata: dto.metadata,
        actorId,
        centerId,
        ipAddress,
        userAgent,
      });

      try {
        this.logger.log(`Activity logged: ${dto.type} - ${dto.description}`, {
          activityId: activityLog.id,
          actorId,
          centerId,
        });
      } catch (loggerError) {
        // Fallback to console if logger fails
        console.log(`Activity logged: ${dto.type} - ${dto.description}`, {
          activityId: activityLog.id,
          actorId,
          centerId,
        });
      }

      return activityLog;
    } catch (error) {
      try {
        this.logger.error('Failed to create activity log', {
          error: error.message,
          dto,
        });
      } catch (loggerError) {
        // Fallback to console if logger fails
        console.error('Failed to create activity log', {
          error: error.message,
          dto,
        });
      }
      throw error;
    }
  }

  async logUserActivity(
    type: ActivityType,
    description: string,
    actorId: string,
    targetUserId?: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description,
      metadata,
      actorId,
    });
  }

  async logCenterActivity(
    type: ActivityType,
    description: string,
    actorId: string,
    centerId: string,
    targetUserId?: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description,
      metadata,
      actorId,
      centerId,
    });
  }

  async logGlobalActivity(
    type: ActivityType,
    description: string,
    actorId: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description,
      metadata,
      actorId,
    });
  }

  /**
   * Log activity with automatic actor and center ID assignment from current request context
   */
  async logActivity(
    type: ActivityType,
    description?: string,
    metadata?: Record<string, any>,
    overrideActorId?: string,
    overrideCenterId?: string,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description: description || '',
      metadata,
      actorId: overrideActorId,
      centerId: overrideCenterId,
    });
  }

  /**
   * Log activity with ActorUser object (automatically extracts actorId and centerId)
   */
  async logActivityWithActor(
    type: ActivityType,
    actor: ActorUser,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description: description || '',
      metadata,
      actorId: actor.id,
      centerId: actor.centerId,
    });
  }

  /**
   * Log activity for a specific target user
   */
  async logActivityForTarget(
    type: ActivityType,
    description: string,
    targetUserId: string,
    metadata?: Record<string, any>,
    overrideActorId?: string,
    overrideCenterId?: string,
  ): Promise<ActivityLog> {
    const enhancedMetadata = {
      ...metadata,
      targetUserId,
    };

    return this.createActivityLog({
      type,
      description,
      metadata: enhancedMetadata,
      actorId: overrideActorId,
      centerId: overrideCenterId,
    });
  }

  /**
   * Log system events (no actor required)
   */
  async logSystemEvent(
    type: ActivityType,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.createActivityLog({
      type,
      description,
      metadata,
      actorId: null, // System events don't have an actor
      centerId: null, // System events are global
    });
  }

  /**
   * Simple log method - single method that handles everything
   */
  async log(
    type: ActivityType,
    metadata?: Record<string, any>,
    actor?: ActorUser,
  ): Promise<ActivityLog> {
    try {
      if (actor) {
        return await this.logActivityWithActor(type, actor, '', metadata);
      } else {
        return await this.logActivity(type, '', metadata);
      }
    } catch (error) {
      this.logger.error('Failed to log activity', {
        type,
        error: error.message,
      });
      throw error;
    }
  }

  async clearAllLogs(): Promise<void> {
    // await this.activityLogRepository.();
    // console.log('All activity logs cleared');
  }
}
