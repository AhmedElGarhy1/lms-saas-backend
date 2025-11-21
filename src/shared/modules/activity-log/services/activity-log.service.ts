import { Injectable } from '@nestjs/common';
import { ActivityLog } from '../entities/activity-log.entity';
import { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { RequestContext } from '@/shared/common/context/request.context';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BaseService } from '@/shared/common/services/base.service';
import { Logger } from '@nestjs/common';
import { ActivityLogTypesResponseDto } from '../dto/activity-log-types-response.dto';
import { SystemActivityType } from '../enums/system-activity-type.enum';
import { AuthActivityType } from '@/modules/auth/enums/auth-activity-type.enum';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import { RoleActivityType } from '@/modules/access-control/enums/role-activity-type.enum';
import { StaffActivityType } from '@/modules/staff/enums/staff-activity-type.enum';
import { AdminActivityType } from '@/modules/admin/enums/admin-activity-type.enum';

@Injectable()
export class ActivityLogService extends BaseService {
  private readonly logger: Logger = new Logger(ActivityLogService.name);

  constructor(private readonly activityLogRepository: ActivityLogRepository) {
    super();
  }

  private async createActivityLog(
    dto: CreateActivityLogDto,
  ): Promise<ActivityLog | null> {
    try {
      // Get current request context for automatic actor and center ID assignment
      const requestContext = RequestContext.get();

      // Actor is ALWAYS from RequestContext (never passed as parameter)
      // If not in context, it's a system event (null is okay)
      const actorId = requestContext?.userId ?? null;

      // Target user is who the action was performed on (explicitly provided)
      const userId = dto.userId ?? null;

      const centerId =
        dto.centerId !== undefined ? dto.centerId : requestContext?.centerId;

      // Auto-assign IP address and user agent from context if not provided
      const ipAddress = dto.ipAddress || requestContext?.ipAddress;
      const userAgent = dto.userAgent || requestContext?.userAgent;

      const activityLog = await this.activityLogRepository.create({
        type: dto.type,
        metadata: dto.metadata,
        actorId,
        userId,
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
   *
   * @param type - Activity type
   * @param metadata - Optional metadata
   * @param userId - Target user ID (who the action was performed on). If not provided, defaults to null.
   *                 For self-actions, pass the same user ID as the actor (from RequestContext).
   */
  async log(
    type: string,
    metadata?: Record<string, any>,
    userId?: string | null,
  ): Promise<ActivityLog | null> {
    return await this.createActivityLog({
      type,
      metadata,
      userId: userId ?? null,
      // actorId and centerId come from RequestContext automatically
    });
  }

  /**
   * Get paginated activity logs with filtering
   */
  async getActivityLogs(
    query: PaginateActivityLogsDto,
    actor: ActorUser,
  ): Promise<Pagination<ActivityLog>> {
    return this.activityLogRepository.paginateActivityLogs(query, actor);
  }

  /**
   * Get all activity log types from all modules, grouped by category
   */
  getAllActivityLogTypes(): ActivityLogTypesResponseDto {
    return {
      system: Object.values(SystemActivityType),
      auth: Object.values(AuthActivityType),
      user: Object.values(UserActivityType),
      center: Object.values(CenterActivityType),
      role: Object.values(RoleActivityType),
      staff: Object.values(StaffActivityType),
      admin: Object.values(AdminActivityType),
    };
  }
}
