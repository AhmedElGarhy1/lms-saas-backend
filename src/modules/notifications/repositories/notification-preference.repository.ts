import { Injectable } from '@nestjs/common';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class NotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof NotificationPreference {
    return NotificationPreference;
  }

  async findByUserId(userId: string): Promise<NotificationPreference[]> {
    return this.findMany({
      where: { userId },
    });
  }

  async findPreference(
    userId: string,
    channel: NotificationChannel,
    group: NotificationGroup,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<NotificationPreference | null> {
    const whereClause: any = {
      userId,
      channel,
      group,
    };

    // Handle nullable fields - TypeORM requires explicit null handling
    if (profileType !== undefined) {
      whereClause.profileType = profileType;
    } else {
      whereClause.profileType = null;
    }

    if (profileId !== undefined) {
      whereClause.profileId = profileId;
    } else {
      whereClause.profileId = null;
    }

    const preferences = await this.findMany({
      where: whereClause,
      take: 1,
    });
    return preferences.length > 0 ? preferences[0] : null;
  }

  async isEnabled(
    userId: string,
    channel: NotificationChannel,
    group: NotificationGroup,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<boolean> {
    // First check profile-scoped preference if profileType/profileId provided
    if (profileType && profileId) {
      const profilePreference = await this.findPreference(
        userId,
        channel,
        group,
        profileType,
        profileId,
      );
      if (profilePreference !== null) {
        return profilePreference.enabled;
      }
    }

    // Fall back to user-level preference
    const userPreference = await this.findPreference(
      userId,
      channel,
      group,
      null,
      null,
    );
    // Default to enabled if preference doesn't exist
    return userPreference ? userPreference.enabled : true;
  }

  async createDefaultPreferences(userId: string): Promise<void> {
    const channels = Object.values(NotificationChannel);
    const groups = Object.values(NotificationGroup);

    const preferences = channels.flatMap((channel) =>
      groups.map((group) => ({
        userId,
        channel,
        group,
        enabled: true,
      })),
    );

    await Promise.all(
      preferences.map((pref) =>
        this.create({
          userId: pref.userId,
          channel: pref.channel,
          group: pref.group,
          enabled: pref.enabled,
        }),
      ),
    );
  }
}
