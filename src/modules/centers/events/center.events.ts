import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
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
  ) {
    super(actor);
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
  ) {
    super(actor);
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
  ) {
    super(actor);
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
  ) {
    super(actor);
  }
}

export class CreateCenterOwnerEvent extends BaseEvent {
  constructor(
    public readonly center: Center,
    public readonly userData: CreateUserDto,
    public readonly roleId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class AssignCenterOwnerEvent extends BaseEvent {
  constructor(
    public readonly center: Center,
    public readonly actor: ActorUser,
    public readonly userProfile?: UserProfile,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that centers data was exported.
 */
export class CenterExportedEvent extends BaseEvent {
  constructor(
    public readonly format: string,
    public readonly filename: string,
    public readonly recordCount: number,
    public readonly filters: Record<string, any>,
    actor: ActorUser,
  ) {
    super(actor);
  }
}
