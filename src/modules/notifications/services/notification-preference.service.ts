import { Injectable } from '@nestjs/common';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    private readonly preferenceRepository: NotificationPreferenceRepository,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.findByUserId(userId);
  }

  async isEnabled(
    userId: string,
    channel: NotificationChannel,
    group: NotificationGroup,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<boolean> {
    return this.preferenceRepository.isEnabled(
      userId,
      channel,
      group,
      profileType,
      profileId,
    );
  }

  async updatePreference(
    userId: string,
    channel: NotificationChannel,
    group: NotificationGroup,
    enabled: boolean,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findPreference(
      userId,
      channel,
      group,
      profileType,
      profileId,
    );

    if (preference) {
      preference.enabled = enabled;
      const updated = await this.preferenceRepository.update(preference.id, {
        enabled,
      });
      if (!updated) {
        throw new Error(
          `Failed to update notification preference for user ${userId}`,
        );
      }
      return updated;
    } else {
      return this.preferenceRepository.create({
        userId,
        channel,
        group,
        enabled,
        profileType: profileType ?? null,
        profileId: profileId ?? null,
      });
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Array<{
      channel: NotificationChannel;
      group: NotificationGroup;
      enabled: boolean;
    }>,
  ): Promise<NotificationPreference[]> {
    return Promise.all(
      preferences.map((pref) =>
        this.updatePreference(userId, pref.channel, pref.group, pref.enabled),
      ),
    );
  }

  async createDefaultPreferences(userId: string): Promise<void> {
    await this.preferenceRepository.createDefaultPreferences(userId);
  }

  async enableAllChannels(userId: string): Promise<void> {
    const channels = Object.values(NotificationChannel);
    const groups = Object.values(NotificationGroup);

    await Promise.all(
      channels.flatMap((channel) =>
        groups.map((group) =>
          this.updatePreference(userId, channel, group, true),
        ),
      ),
    );
  }

  async disableAllChannels(userId: string): Promise<void> {
    const channels = Object.values(NotificationChannel);
    const groups = Object.values(NotificationGroup);

    await Promise.all(
      channels.flatMap((channel) =>
        groups.map((group) =>
          this.updatePreference(userId, channel, group, false),
        ),
      ),
    );
  }

  async disableGroup(userId: string, group: NotificationGroup): Promise<void> {
    const channels = Object.values(NotificationChannel);

    await Promise.all(
      channels.map((channel) =>
        this.updatePreference(userId, channel, group, false),
      ),
    );
  }
}
