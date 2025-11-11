import { Injectable } from '@nestjs/common';
import { ActivityLog } from '../entities/activity-log.entity';
import { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { RequestContext } from '@/shared/common/context/request.context';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AuthenticationFailedException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class ActivityLogService extends BaseService {
  private readonly logger: Logger;

  constructor(private readonly activityLogRepository: ActivityLogRepository) {
    super();
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  private async createActivityLog(
    dto: CreateActivityLogDto,
  ): Promise<ActivityLog | null> {
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

      return activityLog;
    } catch (error: unknown) {
      // Activity logging should never break application flow
      this.logger.error(
        `Failed to create activity log - type: ${dto.type}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Simple log method - single method that handles everything
   * Fault-tolerant: never throws errors, returns null on failure
   */
  async log(
    type: string,
    metadata?: Record<string, any>,
    actor?: ActorUser,
  ): Promise<ActivityLog | null> {
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
