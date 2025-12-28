import { Injectable } from '@nestjs/common';
import { Not, In } from 'typeorm';
import {
  Enrollment,
  EnrollmentStatus,
} from '../entities/enrollment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class EnrollmentRepository extends BaseRepository<Enrollment> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Enrollment {
    return Enrollment;
  }

  /**
   * Find enrollment by session and student
   */
  async findBySessionAndStudent(
    sessionId: string,
    studentId: string,
  ): Promise<Enrollment | null> {
    return this.getRepository().findOne({
      where: { sessionId, studentId },
      relations: ['student', 'session', 'studentPackage'],
    });
  }

  /**
   * Find all enrollments for a session
   */
  async findBySessionId(sessionId: string): Promise<Enrollment[]> {
    return this.getRepository().find({
      where: { sessionId },
      relations: ['student', 'studentPackage'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find active enrollments for a student
   */
  async findActiveByStudentId(
    studentId: string,
  ): Promise<Enrollment[]> {
    return this.getRepository().find({
      where: {
        studentId,
        status: In([EnrollmentStatus.LOCKED, EnrollmentStatus.PAID]),
      },
      relations: ['session', 'studentPackage'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if session is already paid for by student
   */
  async isSessionPaidByStudent(
    sessionId: string,
    studentId: string,
  ): Promise<boolean> {
    const count = await this.getRepository().count({
      where: {
        sessionId,
        studentId,
        status: Not(In([EnrollmentStatus.CANCELLED])),
      },
    });

    return count > 0;
  }

  /**
   * Count enrollments for a session
   */
  async countEnrollmentsForSession(sessionId: string): Promise<number> {
    return this.getRepository().count({
      where: {
        sessionId,
        status: Not(In([EnrollmentStatus.CANCELLED])),
      },
    });
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    await this.getRepository().update(enrollmentId, {
      status,
      updatedAt: new Date(),
    });

    return this.findOneOrThrow(enrollmentId);
  }

  /**
   * Mark enrollment as attended
   */
  async markAsAttended(enrollmentId: string): Promise<Enrollment> {
    await this.getRepository().update(enrollmentId, {
      isAttended: true,
      checkedInAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findOneOrThrow(enrollmentId);
  }

  /**
   * Mark enrollment as cancelled
   */
  async markAsCancelled(enrollmentId: string): Promise<Enrollment> {
    await this.getRepository().update(enrollmentId, {
      status: EnrollmentStatus.CANCELLED,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findOneOrThrow(enrollmentId);
  }

  /**
   * Find locked enrollments for past sessions
   */
  async findLockedEnrollmentsForPastSessions(): Promise<Enrollment[]> {
    return this.getRepository()
      .createQueryBuilder('e')
      .leftJoin('e.session', 's')
      .where('e.status = :status', { status: EnrollmentStatus.LOCKED })
      .andWhere('s.endTime < :now', { now: new Date() })
      .getMany();
  }

  /**
   * Find locked enrollments for a specific session
   */
  async findLockedBySessionId(
    sessionId: string,
  ): Promise<Enrollment[]> {
    return this.getRepository().find({
      where: {
        sessionId,
        status: EnrollmentStatus.LOCKED,
      },
      relations: ['studentPackage'],
    });
  }

  /**
   * Find enrollments for a student with session details
   */
  async findStudentEnrollmentHistory(
    studentId: string,
  ): Promise<Enrollment[]> {
    return this.getRepository().find({
      where: { studentId },
      relations: ['session', 'studentPackage'],
      order: { createdAt: 'DESC' },
    });
  }
}
