import { Branch } from '@/modules/centers/entities/branch.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateBranchDto } from '@/modules/centers/dto/create-branch.dto';

export enum BranchEvents {
  CREATED = 'branch.created',
  UPDATED = 'branch.updated',
  DELETED = 'branch.deleted',
  RESTORED = 'branch.restored',
}

export class BranchCreatedEvent {
  constructor(
    public readonly branch: Branch,
    public readonly actor: ActorUser,
  ) {}
}

export class BranchUpdatedEvent {
  constructor(
    public readonly branchId: string,
    public readonly updates: CreateBranchDto,
    public readonly actor: ActorUser,
  ) {}
}

export class BranchDeletedEvent {
  constructor(
    public readonly branchId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class BranchRestoredEvent {
  constructor(
    public readonly branchId: string,
    public readonly actor: ActorUser,
  ) {}
}
