import { Injectable } from '@nestjs/common';
import {
  StudentClassSubscription,
  SubscriptionStatus,
} from '../entities/student-class-subscription.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
@Injectable()
export class StudentClassSubscriptionsRepository extends BaseRepository<StudentClassSubscription> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => StudentClassSubscription {
    return StudentClassSubscription;
  }

  async findActiveSubscription(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentClassSubscription | null> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        classId,
        year: currentYear,
        month: currentMonth,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async findExistingSubscription(
    studentUserProfileId: string,
    classId: string,
    year: number,
    month: number,
  ): Promise<StudentClassSubscription | null> {
    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        classId,
        year,
        month,
      },
    });
  }

  async saveSubscription(
    subscription: StudentClassSubscription,
  ): Promise<StudentClassSubscription> {
    return this.getRepository().save(subscription);
  }

  async createSubscription(
    data: Partial<StudentClassSubscription>,
  ): Promise<StudentClassSubscription> {
    const subscription = this.getRepository().create(data);
    return this.getRepository().save(subscription);
  }

  async findSubscriptionById(
    subscriptionId: string,
  ): Promise<StudentClassSubscription | null> {
    return this.getRepository().findOne({
      where: { id: subscriptionId },
    });
  }
}
