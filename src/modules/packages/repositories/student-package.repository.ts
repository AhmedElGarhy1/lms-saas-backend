import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, MoreThan, In } from 'typeorm';
import { StudentPackage, StudentPackageStatus } from '../entities/student-package.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class StudentPackageRepository extends BaseRepository<StudentPackage> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof StudentPackage {
    return StudentPackage;
  }

  /**
   * Find active packages for a student
   */
  async findActiveByStudentId(studentProfileId: string): Promise<StudentPackage[]> {
    return this.getRepository().find({
      where: {
        studentProfileId,
        status: StudentPackageStatus.ACTIVE,
      },
      relations: ['package', 'package.group'],
      order: { createdAt: 'ASC' }, // FIFO order
    });
  }

  /**
   * Find packages for a student with specific class
   */
  async findActiveByStudentAndClass(
    studentProfileId: string,
    classId: string,
  ): Promise<StudentPackage[]> {
    return this.getRepository().find({
      where: {
        studentProfileId,
        status: StudentPackageStatus.ACTIVE,
        package: { classId },
        remainingSessions: MoreThan(0),
      },
      relations: ['package', 'package.class'],
      order: { createdAt: 'ASC' }, // FIFO order
    });
  }

  /**
   * Get aggregated package credits for a student by class
   */
  async getStudentPackageSummary(studentProfileId: string): Promise<any[]> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('sp')
      .leftJoin('sp.package', 'cp')
      .leftJoin('cp.class', 'c')
      .leftJoin('c.branch', 'b')
      .leftJoin('c.center', 'ce')
      .select([
        'c.id as "classId"',
        'c.name as "className"',
        'c.subject as "subjectName"',
        'b.name as "branchName"',
        'ce.name as "centerName"',
        'SUM(sp."remainingSessions") as "totalAvailable"',
      ])
      .where('sp."studentProfileId" = :studentId', { studentId: studentProfileId })
      .andWhere('sp.status = :status', { status: StudentPackageStatus.ACTIVE })
      .groupBy('c.id, c.name, c.subject, b.name, ce.name')
      .orderBy('c.name', 'ASC');

    return queryBuilder.getRawMany();
  }

  /**
   * Find oldest active package with available sessions for a student and class
   */
  async findOldestAvailablePackage(
    studentProfileId: string,
    classId: string,
  ): Promise<StudentPackage | null> {
    return this.getRepository().findOne({
      where: {
        studentProfileId,
        status: StudentPackageStatus.ACTIVE,
        package: { classId },
        remainingSessions: MoreThan(0),
      },
      relations: ['package', 'package.class'],
      order: { createdAt: 'ASC' }, // FIFO
    });
  }

  /**
   * Update package sessions
   */
  async updatePackageSessions(
    packageId: string,
    remainingSessions: number,
  ): Promise<StudentPackage> {
    await this.getRepository().update(packageId, {
      remainingSessions,
      updatedAt: new Date(),
    });

    return this.findOneOrThrow(packageId);
  }

  /**
   * Check if student has any active packages for a class
   */
  async hasActivePackagesForClass(
    studentProfileId: string,
    classId: string,
  ): Promise<boolean> {
    const count = await this.getRepository().count({
      where: {
        studentProfileId,
        status: StudentPackageStatus.ACTIVE,
        package: { classId },
        remainingSessions: MoreThan(0),
      },
    });

    return count > 0;
  }
}
