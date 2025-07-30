import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerification } from '../entities/email-verification.entity';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class EmailVerificationRepository {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    private readonly logger: LoggerService,
  ) {}

  async createEmailVerification(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    const emailVerification = this.emailVerificationRepository.create(data);
    return this.emailVerificationRepository.save(emailVerification);
  }

  async findEmailVerification(
    token: string,
  ): Promise<EmailVerification | null> {
    return this.emailVerificationRepository.findOne({
      where: { token },
      relations: { user: true },
    });
  }

  async deleteEmailVerification(token: string): Promise<void> {
    await this.emailVerificationRepository.delete({ token });
  }

  async deleteExpiredVerifications(): Promise<void> {
    await this.emailVerificationRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
