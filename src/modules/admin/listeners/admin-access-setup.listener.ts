import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import {
  AdminProfileCreatedEvent,
  AdminAccessSetupNeededEvent,
  AdminEvents,
} from '@/modules/admin/events/admin.events';

@Injectable()
export class AdminAccessSetupListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AdminEvents.PROFILE_CREATED)
  async handleAdminProfileCreated(event: AdminProfileCreatedEvent) {
    const { userProfileId, dto, actor } = event;
    const centerId = dto.centerId ?? actor.centerId;

    // Grant center access
    if (centerId) {
      await this.accessControlService.grantCenterAccess(
        { userProfileId, centerId },
        actor,
      );
    }

    // Grant user access
    const bypassUserAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );
    if (!bypassUserAccess) {
      await this.accessControlService.grantUserAccessInternal({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: userProfileId,
        centerId,
      });
    }

    // Check if role assignment is needed
    if (dto.roleId) {
      this.eventEmitter.emit(
        AdminEvents.ACCESS_SETUP_NEEDED,
        new AdminAccessSetupNeededEvent(
          event.userId,
          userProfileId,
          event.adminId,
          dto,
          actor,
        ),
      );
    } else {
      // No role needed, emit completion event
      this.eventEmitter.emit(AdminEvents.CREATED, {
        userProfileId,
        dto,
        actor,
      });
    }
  }
}
