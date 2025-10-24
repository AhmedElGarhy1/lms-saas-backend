import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmailVerification } from '../entities/email-verification.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class EmailVerificationRepository extends BaseRepository<EmailVerification> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof EmailVerification {
    return EmailVerification;
  }

  async createEmailVerification(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    const emailVerification = this.getRepository().create(data);
    return this.getRepository().save(emailVerification);
  }

  async findEmailVerification(
    token: string,
  ): Promise<EmailVerification | null> {
    return this.getRepository().findOne({
      where: { token },
      relations: { user: true },
    });
  }

  async deleteEmailVerification(token: string): Promise<void> {
    await this.getRepository().delete({ token });
  }

  async deleteExpiredVerifications(): Promise<void> {
    await this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
