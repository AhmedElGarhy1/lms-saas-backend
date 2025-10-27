import { Injectable, Logger } from '@nestjs/common';
import { ActivityLog } from '../entities/activity-log.entity';
import { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { RequestContext } from '@/shared/common/context/request.context';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AuthenticationFailedException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  private async createActivityLog(
    dto: CreateActivityLogDto,
  ): Promise<ActivityLog> {
    try {
      // Get current request context for automatic actor and center ID assignment
      const requestContext = RequestContext.get();

      // Auto-assign actorId and centerId from context if not provided
      const actorId =
        dto.actorId !== undefined ? dto.actorId : requestContext?.userId;
      const centerId =
        dto.centerId !== undefined ? dto.centerId : requestContext?.centerId;

      // Auto-assign IP address and user agent from context if not provided
      const ipAddress = dto.ipAddress || requestContext?.ipAddress;
      const userAgent = dto.userAgent || requestContext?.userAgent;

      const activityLog = await this.activityLogRepository.create({
        type: dto.type,
        metadata: dto.metadata,
        userId: actorId,
        centerId,
        ipAddress,
        userAgent,
      });

      try {
        this.logger.log(`Activity logged: ${dto.type}`, {
          activityId: activityLog.id,
          actorId,
          centerId,
          requestId: requestContext?.requestId,
          ipAddress,
        });
      } catch {
        // Fallback to console if logger fails
        console.log(`Activity logged: ${dto.type}`, {
          activityId: activityLog.id,
          actorId,
          centerId,
          requestId: requestContext?.requestId,
          ipAddress,
        });
      }

      return activityLog;
    } catch (error: unknown) {
      try {
        this.logger.error('Failed to create activity log', {
          error: error instanceof Error ? error.message : String(error),
          dto,
        });
      } catch {
        // Fallback to console if logger fails
        console.error('Failed to create activity log', {
          error: error instanceof Error ? error.message : String(error),
          dto,
        });
      }
      throw error;
    }
  }

  /**
   * Simple log method - single method that handles everything
   */
  async log(
    type: string,
    metadata?: Record<string, any>,
    actor?: ActorUser,
  ): Promise<ActivityLog> {
    try {
      if (actor && actor.id) {
        return await this.createActivityLog({
          type,
          metadata,
          actorId: actor.id,
          centerId: actor.centerId,
        });
      } else {
        return await this.createActivityLog({
          type,
          metadata,
        });
      }
    } catch (error: unknown) {
      this.logger.error('Failed to log activity', {
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get paginated activity logs with filtering
   */
  async getActivityLogs(
    query: PaginateActivityLogsDto,
  ): Promise<Pagination<ActivityLog>> {
    const requestContext = RequestContext.get();
    const actorId = requestContext?.userId;

    if (!actorId) {
      throw new AuthenticationFailedException(
        'User must be authenticated to view activity logs',
      );
    }

    return this.activityLogRepository.paginateActivityLogs(query, actorId);
  }
}
