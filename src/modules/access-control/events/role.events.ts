import { Role } from '@/modules/access-control/entities/role.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateRoleRequestDto } from '@/modules/access-control/dto/create-role.dto';

export enum RoleEvents {
  CREATED = 'role.created',
  UPDATED = 'role.updated',
  DELETED = 'role.deleted',
  ASSIGNED = 'role.assigned',
  REVOKED = 'role.revoked',
}

export class RoleCreatedEvent {
  constructor(
    public readonly role: Role,
    public readonly actor: ActorUser,
  ) {}
}

export class RoleUpdatedEvent {
  constructor(
    public readonly roleId: string,
    public readonly updates: CreateRoleRequestDto,
    public readonly actor: ActorUser,
  ) {}
}

export class RoleDeletedEvent {
  constructor(
    public readonly roleId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RoleAssignedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly centerId: string,
    public readonly actor?: ActorUser,
  ) {}
}

export class RoleRevokedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor?: ActorUser,
  ) {}
}
