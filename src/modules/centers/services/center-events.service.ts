import { Injectable, Logger } from '@nestjs/common';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Center } from '../entities/center.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';

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
    await this.rolesService.createRole(
      {
        name: `Center Admin`,
        type: RoleType.CENTER,
        description: `Default admin role for center: ${center.name}`,
        centerId: center.id,
        permissions: [], // TODO: Add default permissions for center admin role
      },
      { id: center.createdBy } as ActorUser,
    );

    // Log the activity
    await this.activityLogService.log(ActivityType.CENTER_CREATED, {
      centerId: center.id,
      centerName: center.name,
      createdBy: center.createdBy,
    });
  }

  async handleCenterUpdated(center: Center) {
    this.logger.log(`Center updated: ${center.id}`);

    // Log the activity - using createdBy since updatedBy doesn't exist
    await this.activityLogService.log(ActivityType.CENTER_UPDATED, {
      centerId: center.id,
      centerName: center.name,
      updatedBy: center.createdBy, // Using createdBy since updatedBy doesn't exist in the entity
    });
  }
}
