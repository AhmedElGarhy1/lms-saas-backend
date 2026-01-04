import { Injectable } from '@nestjs/common';
import { StudentClassCharge } from '../entities/student-class-charge.entity';
import { ChargeStatus } from '../entities/student-session-charge.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class StudentClassChargesRepository extends BaseRepository<StudentClassCharge> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => StudentClassCharge {
    return StudentClassCharge;
  }

  async findPaidClassCharge(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentClassCharge | null> {
    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        classId,
        status: ChargeStatus.PAID,
      },
    });
  }

  async findExistingClassCharge(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentClassCharge | null> {
    return this.getRepository().findOne({
      where: { studentUserProfileId, classId },
    });
  }

  async saveClassCharge(
    classCharge: StudentClassCharge,
  ): Promise<StudentClassCharge> {
    return this.getRepository().save(classCharge);
  }

  async createClassCharge(
    data: Partial<StudentClassCharge>,
  ): Promise<StudentClassCharge> {
    const classCharge = this.getRepository().create(data);
    return this.getRepository().save(classCharge);
  }

  async findClassChargeById(
    chargeId: string,
  ): Promise<StudentClassCharge | null> {
    return this.getRepository().findOne({
      where: { id: chargeId },
    });
  }
}
