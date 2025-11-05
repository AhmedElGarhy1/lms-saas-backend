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
    correlationId?: string,
  ) {
    super(actor, 'role.command.handler', correlationId);
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
    correlationId?: string,
  ) {
    super(actor, 'role.command.handler', correlationId);
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
    correlationId?: string,
  ) {
    super(actor, 'role.command.handler', correlationId);
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
    correlationId?: string,
  ) {
    super(actor, 'role.command.handler', correlationId);
  }
}
