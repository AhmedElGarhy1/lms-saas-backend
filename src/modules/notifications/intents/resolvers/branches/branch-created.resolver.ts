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
import { BranchesRepository } from '@/modules/centers/repositories/branches.repository';
import { BranchAccessRepository } from '@/modules/centers/repositories/branch-access.repository';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';

/**
 * Resolver for BRANCH_CREATED notification intent
 * Handles OWNERS and STAFF audiences.
 */
@Injectable()
export class BranchCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.BRANCH_CREATED>
{
  private readonly logger: Logger = new Logger(BranchCreatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
    private readonly branchesRepository: BranchesRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
    @InjectRepository(ProfileRole)
    private readonly profileRoleRepository: Repository<ProfileRole>,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.BRANCH_CREATED>,
    audience: AudienceIdForNotification<NotificationType.BRANCH_CREATED>,
  ) {
    const branch = await this.branchesRepository.findOne(intent.branchId);
    if (!branch) {
      throw new Error(
        `BRANCH_CREATED: Branch not found: ${intent.branchId}`,
      );
    }
    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `BRANCH_CREATED: Center not found: ${intent.centerId}`,
      );
    }
    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const templateVariables = {
      branchName: branch.name ?? `${branch.city}${branch.address ? ` - ${branch.address}` : ''}`,
      centerName: center.name,
      actorName,
    };

    const recipients = await this.buildRecipients(
      audience,
      intent.centerId,
      intent.branchId,
      intent.actorId,
    );

    return { templateVariables, recipients };
  }

  private async buildRecipients(
    audience: AudienceIdForNotification<NotificationType.BRANCH_CREATED>,
    centerId: string,
    branchId: string,
    actorUserProfileId: string,
  ): Promise<RecipientInfo[]> {
    const recipients: RecipientInfo[] = [];
    const seen = new Set<string>();

    if (audience === 'OWNERS') {
      const owners = await this.getCenterOwners(centerId);
      for (const owner of owners) {
        if (owner.id === actorUserProfileId) continue;
        if (seen.has(owner.id)) continue;
        seen.add(owner.id);
        const user = await this.userService.findOne(owner.userId);
        if (user) {
          recipients.push({
            userId: user.id,
            profileId: owner.id,
            profileType: owner.profileType,
            phone: user.getPhone(),
            email: null,
            locale: this.extractLocale(user),
          });
        }
      }
    } else if (audience === 'STAFF') {
      const staff = await this.branchAccessRepository.findByBranchAndCenter(
        branchId,
        centerId,
      );
      for (const ba of staff) {
        if (ba.userProfileId === actorUserProfileId) continue;
        if (seen.has(ba.userProfileId)) continue;
        seen.add(ba.userProfileId);
        const profile = await this.userProfileService.findOne(ba.userProfileId);
        if (!profile) continue;
        const user = await this.userService.findOne(profile.userId);
        if (user) {
          recipients.push({
            userId: user.id,
            profileId: profile.id,
            profileType: profile.profileType,
            phone: user.getPhone(),
            email: null,
            locale: this.extractLocale(user),
          });
        }
      }
    }

    return recipients;
  }

  private async getCenterOwners(centerId: string) {
    const profileRoles = await this.profileRoleRepository
      .createQueryBuilder('pr')
      .innerJoin('pr.role', 'role')
      .leftJoinAndSelect('pr.userProfile', 'userProfile')
      .where('pr.centerId = :centerId', { centerId })
      .andWhere('role.name = :roleName', { roleName: DefaultRoles.OWNER })
      .getMany();
    return profileRoles
      .map((pr) => pr.userProfile)
      .filter((p): p is NonNullable<typeof p> => p != null);
  }
}
