import { Injectable } from '@nestjs/common';
import {
  StudentSessionCharge,
  ChargeStatus,
} from '../entities/student-session-charge.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class StudentSessionChargesRepository extends BaseRepository<StudentSessionCharge> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => StudentSessionCharge {
    return StudentSessionCharge;
  }

  async findPaidSessionCharge(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<StudentSessionCharge | null> {
    return this.getRepository().findOne({
      where: { studentUserProfileId, sessionId },
    });
  }

  async findExistingSessionCharge(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<StudentSessionCharge | null> {
    return this.getRepository().findOne({
      where: { studentUserProfileId, sessionId },
    });
  }

  async saveSessionCharge(
    sessionCharge: StudentSessionCharge,
  ): Promise<StudentSessionCharge> {
    return this.getRepository().save(sessionCharge);
  }

  async createSessionCharge(
    data: Partial<StudentSessionCharge>,
  ): Promise<StudentSessionCharge> {
    const sessionCharge = this.getRepository().create(data);
    return this.getRepository().save(sessionCharge);
  }

  async findSessionChargeById(
    chargeId: string,
  ): Promise<StudentSessionCharge | null> {
    return this.getRepository().findOne({
      where: { id: chargeId },
    });
  }
}
