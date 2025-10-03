import { Injectable, Logger } from '@nestjs/common';
import { ActivityLog, ActivityType } from '../entities/activity-log.entity';
import { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import { ActivityLogRepository } from '../repositories/activity-log.repository';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async createActivityLog(dto: CreateActivityLogDto): Promise<ActivityLog> {
    try {
      const activityLog = await this.activityLogRepository.create({
        type: dto.type,
        description: dto.description,
        metadata: dto.metadata,
        actorId: dto.actorId,
        centerId: dto.centerId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      });

      try {
        this.logger.log(`Activity logged: ${dto.type} - ${dto.description}`, {
          activityId: activityLog.id,
          actorId: dto.actorId,
          centerId: dto.centerId,
        });
      } catch (loggerError) {
        // Fallback to console if logger fails
        console.log(`Activity logged: ${dto.type} - ${dto.description}`, {
          activityId: activityLog.id,
          actorId: dto.actorId,
          centerId: dto.centerId,
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

  async clearAllLogs(): Promise<void> {
    // await this.activityLogRepository.();
    // console.log('All activity logs cleared');
  }
}
