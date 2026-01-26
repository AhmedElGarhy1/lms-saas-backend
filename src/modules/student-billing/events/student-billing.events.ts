import { StudentCharge } from '../entities/student-charge.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { Money } from '@/shared/common/utils/money.util';

export class StudentChargeCreatedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly charge: StudentCharge,
    public readonly amount: Money,
  ) {
    super(actor);
  }
}

export class StudentChargeCompletedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly charge: StudentCharge,
    public readonly totalPaid: Money,
  ) {
    super(actor);
  }
}

export class StudentChargeInstallmentPaidEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly charge: StudentCharge,
    public readonly installmentAmount: Money,
    public readonly remainingAmount: Money,
  ) {
    super(actor);
  }
}

export class StudentChargeRefundedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly charge: StudentCharge,
    public readonly refundReason?: string,
  ) {
    super(actor);
  }
}
