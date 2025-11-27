import { Injectable } from '@nestjs/common';
import { VerificationToken } from '../entities/verification-token.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { VerificationType } from '../enums/verification-type.enum';

@Injectable()
export class VerificationTokenRepository extends BaseRepository<VerificationToken> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof VerificationToken {
    return VerificationToken;
  }

  async createVerificationToken(data: {
    userId: string;
    type: VerificationType;
    code: string;
    expiresAt: Date;
  }): Promise<VerificationToken> {
    const verificationToken = this.getRepository().create(data);
    return this.getRepository().save(verificationToken);
  }

  async findByCode(
    code: string,
    type: VerificationType,
    userId?: string,
  ): Promise<VerificationToken | null> {
    const where: { code: string; type: VerificationType; userId?: string } = {
      code,
      type,
    };
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
  ): Promise<VerificationToken | null> {
    return this.getRepository().findOne({
      where: { userId, type },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsVerified(id: string): Promise<void> {
    await this.getRepository().update({ id }, { verifiedAt: new Date() });
  }

  async deleteById(id: string): Promise<void> {
    await this.getRepository().delete({ id });
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

  /**
   * Find all verification tokens
   * Used for testing/debugging purposes only
   * TODO: Remove this method when testing endpoint is removed
   */
  async findAll(): Promise<VerificationToken[]> {
    return this.getRepository().find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }
}
