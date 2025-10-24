import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class PasswordResetRepository extends BaseRepository<PasswordResetToken> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof PasswordResetToken {
    return PasswordResetToken;
  }

  async createPasswordResetToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    const passwordResetToken = this.getRepository().create(data);
    return this.getRepository().save(passwordResetToken);
  }

  async findPasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken | null> {
    return this.getRepository().findOne({
      where: { token },
      relations: { user: true },
    });
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.getRepository().delete({ token });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
