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
import { ExpenseRepository } from '@/modules/expenses/repositories/expense.repository';
import { BranchAccessRepository } from '@/modules/centers/repositories/branch-access.repository';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { Money } from '@/shared/common/utils/money.util';

/**
 * Resolver for EXPENSE_REFUNDED notification
 * OWNERS + STAFF (branch). Push + In-App.
 */
@Injectable()
export class ExpenseRefundedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.EXPENSE_REFUNDED>
{
  private readonly logger = new Logger(ExpenseRefundedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly expenseRepository: ExpenseRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
    @InjectRepository(ProfileRole)
    private readonly profileRoleRepository: Repository<ProfileRole>,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.EXPENSE_REFUNDED>,
    audience: AudienceIdForNotification<NotificationType.EXPENSE_REFUNDED>,
  ) {
    const expense = await this.expenseRepository.findExpenseWithFullRelations(
      intent.expenseId,
    );
    if (!expense) {
      throw new Error(
        `EXPENSE_REFUNDED: Expense not found: ${intent.expenseId}`,
      );
    }

    const center = expense.center;
    if (!center) {
      throw new Error(
        `EXPENSE_REFUNDED: Center not found for expense: ${intent.expenseId}`,
      );
    }

    const branch = expense.branch;
    const branchName = branch
      ? (branch.name ?? `${branch.city}${branch.address ? ` - ${branch.address}` : ''}`)
      : '';

    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const amount =
      expense.amount instanceof Money
        ? expense.amount.toString()
        : String(expense.amount);

    const templateVariables = {
      expenseTitle: expense.title,
      amount,
      centerName: center.name,
      branchName,
      actorName,
      category: expense.category,
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
    audience: AudienceIdForNotification<NotificationType.EXPENSE_REFUNDED>,
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
