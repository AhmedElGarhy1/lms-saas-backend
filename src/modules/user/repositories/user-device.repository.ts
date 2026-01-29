import { Injectable } from '@nestjs/common';
import { UserDevice } from '../entities/user-device.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class UserDeviceRepository extends BaseRepository<UserDevice> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof UserDevice {
    return UserDevice;
  }

  /**
   * Find device by userId and fingerprint
   */
  async findByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<UserDevice | null> {
    return this.getRepository().findOne({
      where: { userId, fingerprint },
    });
  }

  /**
   * Get all devices for a user
   */
  async findByUserId(userId: string): Promise<UserDevice[]> {
    return this.getRepository().find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Get distinct FCM tokens for a user (for PUSH routing).
   * Returns non-null fcmToken values only.
   */
  async findFcmTokensByUserId(userId: string): Promise<string[]> {
    const rows = await this.getRepository()
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

  /**
   * Find device by userId and fcmToken (for invalid-token cleanup).
   */
  async findByUserIdAndFcmToken(
    userId: string,
    token: string,
  ): Promise<UserDevice | null> {
    return this.getRepository().findOne({
      where: { userId, fcmToken: token },
    });
  }
}
