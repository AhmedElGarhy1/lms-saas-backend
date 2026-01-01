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
    return this.getRepository()
      .findOne({
        where: { studentUserProfileId, classId },
      })
      .then((subscription) => {
        if (!subscription) return null;

        // Check if subscription is within date range
        if (subscription.startDate <= now && subscription.endDate >= now) {
          return subscription;
        }

        return null;
      });
  }

  async findExistingSubscription(
    studentUserProfileId: string,
    classId: string,
    monthYear: string,
  ): Promise<StudentClassSubscription | null> {
    return this.getRepository().findOne({
      where: { classId, monthYear },
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
