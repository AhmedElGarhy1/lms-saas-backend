import { Injectable, Logger } from '@nestjs/common';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Center } from '../entities/center.entity';

@Injectable()
export class CenterEventsService {
  private readonly logger = new Logger(CenterEventsService.name);

  constructor(
    private readonly rolesService: RolesService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async handleCenterCreated(center: Center) {
    this.logger.log(`Center created: ${center.id}`);

    // Create default admin role for the center
    await this.rolesService.createRole({
      name: `Center Admin`,
      type: RoleType.CENTER_ADMIN,
      description: `Default admin role for center: ${center.name}`,
      isActive: true,
    });

    // Log the activity
    await this.activityLogService.logCenterActivity(
      ActivityType.CENTER_CREATED,
      'Center created',
      center.createdBy,
      center.id,
      undefined,
      {
        centerName: center.name,
        centerId: center.id,
      },
    );
  }

  async handleCenterUpdated(center: Center) {
    this.logger.log(`Center updated: ${center.id}`);

    // Log the activity - using createdBy since updatedBy doesn't exist
    await this.activityLogService.logCenterActivity(
      ActivityType.CENTER_UPDATED,
      'Center updated',
      center.createdBy, // Using createdBy since updatedBy doesn't exist in the entity
      center.id,
      undefined,
      {
        centerName: center.name,
        centerId: center.id,
      },
    );
  }
}
