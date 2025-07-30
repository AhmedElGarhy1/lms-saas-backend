import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly logger: LoggerService,
  ) {}

  async createPasswordResetToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    const passwordResetToken = this.passwordResetTokenRepository.create(data);
    return this.passwordResetTokenRepository.save(passwordResetToken);
  }

  async findPasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken | null> {
    return this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: { user: true },
    });
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.passwordResetTokenRepository.delete({ token });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.passwordResetTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
