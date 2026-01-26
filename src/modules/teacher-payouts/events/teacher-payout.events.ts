import { TeacherPayoutRecord } from '../entities/teacher-payout-record.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { Money } from '@/shared/common/utils/money.util';
import { PayoutStatus } from '../enums/payout-status.enum';

export class TeacherPayoutCreatedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly payout: TeacherPayoutRecord,
  ) {
    super(actor);
  }
}

export class TeacherPayoutPaidEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly payout: TeacherPayoutRecord,
    public readonly amount: Money,
  ) {
    super(actor);
  }
}

export class TeacherPayoutInstallmentPaidEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly payout: TeacherPayoutRecord,
    public readonly installmentAmount: Money,
    public readonly remainingAmount: Money,
  ) {
    super(actor);
  }
}

export class TeacherPayoutStatusUpdatedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly payout: TeacherPayoutRecord,
    public readonly oldStatus: PayoutStatus,
    public readonly newStatus: PayoutStatus,
  ) {
    super(actor);
  }
}
