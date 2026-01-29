import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserDevice } from '@/modules/user/entities/user-device.entity';

/**
 * Resolves FCM device tokens for a user (from user_devices).
 * Used by the notification router to send PUSH notifications to all registered devices.
 * Uses DataSource directly so it works outside transactional context (e.g. queue workers).
 */
@Injectable()
export class PushTokenResolverService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get distinct FCM tokens for a user. Returns non-null tokens only.
   */
  async getTokensForUser(userId: string): Promise<string[]> {
    const rows = await this.dataSource
      .getRepository(UserDevice)
      .createQueryBuilder('d')
      .select('d.fcmToken')
      .where('d.userId = :userId', { userId })
      .andWhere('d.fcmToken IS NOT NULL')
      .andWhere('d.deletedAt IS NULL')
      .distinct(true)
      .getRawMany<{ fcmToken: string }>();

    const tokens = rows
      .map((r) => r?.fcmToken)
      .filter((t): t is string => !!t && t.trim().length > 0);
    return [...new Set(tokens)];
  }
}
