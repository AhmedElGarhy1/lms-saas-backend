import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { UpdateCenterRequestDto } from '@/modules/centers/dto/update-center.dto';
import { CreateBranchDto } from '@/modules/centers/dto/create-branch.dto';
import { BaseEvent } from '@/shared/common/base/base-event';

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a center was created.
 */
export class CreateCenterEvent extends BaseEvent {
  constructor(
    public readonly center: Center,
    actor: ActorUser,
    public readonly userData?: CreateUserDto,
    public readonly branchData?: CreateBranchDto,
    correlationId?: string,
  ) {
    super(actor, 'center.command.handler', correlationId);
  }
}

export class CreateCenterBranchEvent {
  constructor(
    public readonly center: Center,
    public readonly branchData: CreateBranchDto,
    public readonly actor: ActorUser,
  ) {}
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a center was updated.
 */
export class UpdateCenterEvent extends BaseEvent {
  constructor(
    public readonly centerId: string,
    public readonly updates: Partial<UpdateCenterRequestDto>,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'center.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a center was deleted.
 */
export class DeleteCenterEvent extends BaseEvent {
  constructor(
    public readonly centerId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'center.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a center was restored.
 */
export class RestoreCenterEvent extends BaseEvent {
  constructor(
    public readonly centerId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'center.command.handler', correlationId);
  }
}

export class AssignCenterOwnerEvent {
  constructor(
    public readonly center: Center,
    public readonly userProfile?: UserProfile,
    public readonly actor?: ActorUser,
  ) {}
}
