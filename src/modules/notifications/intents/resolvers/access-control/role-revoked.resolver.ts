import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';

/**
 * Resolver for ROLE_REVOKED notification intent
 * Handles TARGET and OWNERS audiences
 */
@Injectable()
export class RoleRevokedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.ROLE_REVOKED>
{
  private readonly logger: Logger = new Logger(RoleRevokedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
    @InjectRepository(ProfileRole)
    private readonly profileRoleRepository: Repository<ProfileRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.ROLE_REVOKED>,
    audience: AudienceIdForNotification<NotificationType.ROLE_REVOKED>,
  ) {
    const userProfile = await this.userProfileService.findOne(
      intent.userProfileId,
    );
    if (!userProfile) {
      throw new Error(
        `ROLE_REVOKED: UserProfile not found: ${intent.userProfileId}`,
      );
    }

    const role = await this.roleRepository.findOne({
      where: { id: intent.roleId },
    });
    if (!role) {
      throw new Error(`ROLE_REVOKED: Role not found: ${intent.roleId}`);
    }

    const user = await this.userService.findOne(userProfile.userId);
    if (!user) {
      throw new Error(`ROLE_REVOKED: User not found: ${userProfile.userId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    if (!actor) {
      throw new Error(
        `ROLE_REVOKED: Actor profile not found: ${intent.actorId}`,
      );
    }

    const actorUser = await this.userService.findOne(actor.userId);
    if (!actorUser) {
      throw new Error(`ROLE_REVOKED: Actor user not found: ${actor.userId}`);
    }

    let centerName = '';
    if (intent.centerId) {
      const center = await this.centersRepository.findOne(intent.centerId);
      if (center) {
        centerName = center.name;
      }
    }

    const templateVariables = {
      name: user.name,
      roleName: role.name,
      centerName,
      actorName: actorUser.name,
    };

    const recipients: RecipientInfo[] = [];

    if (audience === 'TARGET') {
      recipients.push({
        userId: user.id,
        profileId: userProfile.id,
        profileType: userProfile.profileType,
        phone: user.getPhone(),
        email: null,
        locale: this.extractLocale(user),
      });
    } else if (audience === 'OWNERS' && intent.centerId) {
      const centerOwners = await this.getCenterOwners(intent.centerId);
      for (const owner of centerOwners) {
        const ownerUser = await this.userService.findOne(owner.userId);
        if (ownerUser) {
          recipients.push({
            userId: ownerUser.id,
            profileId: owner.id,
            profileType: owner.profileType,
            phone: ownerUser.getPhone(),
            email: null,
            locale: this.extractLocale(ownerUser),
          });
        }
      }
    }

    return { templateVariables, recipients };
  }

  private async getCenterOwners(centerId: string) {
    const profileRoles = await this.profileRoleRepository
      .createQueryBuilder('pr')
      .innerJoin('pr.role', 'role')
      .leftJoinAndSelect('pr.userProfile', 'userProfile')
      .where('pr.centerId = :centerId', { centerId })
      .andWhere('role.name = :roleName', { roleName: DefaultRoles.OWNER })
      .getMany();
    return profileRoles.map((pr) => pr.userProfile).filter((p) => p !== null);
  }
}
