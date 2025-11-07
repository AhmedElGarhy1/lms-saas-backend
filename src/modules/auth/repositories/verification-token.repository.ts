import { Injectable } from '@nestjs/common';
import { VerificationToken } from '../entities/verification-token.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { VerificationType } from '../enums/verification-type.enum';
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';

@Injectable()
export class VerificationTokenRepository extends BaseRepository<VerificationToken> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof VerificationToken {
    return VerificationToken;
  }

  async createVerificationToken(data: {
    userId: string;
    type: VerificationType;
    channel: NotificationChannel;
    token: string;
    code?: string | null;
    expiresAt: Date;
  }): Promise<VerificationToken> {
    const verificationToken = this.getRepository().create(data);
    return this.getRepository().save(verificationToken);
  }

  async findByToken(token: string): Promise<VerificationToken | null> {
    return this.getRepository().findOne({
      where: { token },
      relations: { user: true },
    });
  }

  async findByCode(
    code: string,
    type: VerificationType,
    channel: NotificationChannel,
    userId?: string,
  ): Promise<VerificationToken | null> {
    const where: any = { code, type, channel };
    if (userId) {
      where.userId = userId;
    }
    return this.getRepository().findOne({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' }, // Get most recent
    });
  }

  async findByUserIdAndType(
    userId: string,
    type: VerificationType,
  ): Promise<VerificationToken[]> {
    return this.getRepository().find({
      where: { userId, type },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserIdTypeAndChannel(
    userId: string,
    type: VerificationType,
    channel: NotificationChannel,
  ): Promise<VerificationToken | null> {
    return this.getRepository().findOne({
      where: { userId, type, channel },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsVerified(token: string): Promise<void> {
    await this.getRepository().update({ token }, { verifiedAt: new Date() });
  }

  async deleteToken(token: string): Promise<void> {
    await this.getRepository().delete({ token });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }

  async deleteByUserIdAndType(
    userId: string,
    type: VerificationType,
  ): Promise<void> {
    await this.getRepository().delete({ userId, type });
  }
}
