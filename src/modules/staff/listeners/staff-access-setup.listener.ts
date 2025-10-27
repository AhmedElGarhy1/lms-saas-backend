import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import {
  StaffProfileCreatedEvent,
  StaffAccessSetupNeededEvent,
  StaffEvents,
} from '@/modules/staff/events/staff.events';

@Injectable()
export class StaffAccessSetupListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffEvents.PROFILE_CREATED)
  async handleStaffProfileCreated(event: StaffProfileCreatedEvent) {
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
        StaffEvents.ACCESS_SETUP_NEEDED,
        new StaffAccessSetupNeededEvent(
          event.userId,
          userProfileId,
          event.staffId,
          dto,
          actor,
        ),
      );
    } else {
      // No role needed, emit completion event
      this.eventEmitter.emit(StaffEvents.CREATED, {
        userProfileId,
        dto,
        actor,
      });
    }
  }
}
