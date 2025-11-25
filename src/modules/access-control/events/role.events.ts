import { Role } from '@/modules/access-control/entities/role.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateRoleRequestDto } from '@/modules/access-control/dto/create-role.dto';
import { BaseEvent } from '@/shared/common/base/base-event';

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a role was created.
 */
export class CreateRoleEvent extends BaseEvent {
  constructor(
    public readonly role: Role,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a role was updated.
 */
export class UpdateRoleEvent extends BaseEvent {
  constructor(
    public readonly roleId: string,
    public readonly updates: CreateRoleRequestDto,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a role was deleted.
 */
export class DeleteRoleEvent extends BaseEvent {
  constructor(
    public readonly roleId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a role was restored.
 */
export class RestoreRoleEvent extends BaseEvent {
  constructor(
    public readonly roleId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that roles data was exported.
 */
export class RoleExportedEvent extends BaseEvent {
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
