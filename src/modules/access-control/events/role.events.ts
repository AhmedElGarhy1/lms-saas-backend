import { Role } from '@/modules/access-control/entities/role.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateRoleRequestDto } from '@/modules/access-control/dto/create-role.dto';

export enum RoleEvents {
  CREATE = 'role.create',
  UPDATE = 'role.update',
  DELETE = 'role.delete',
}

export class CreateRoleEvent {
  constructor(
    public readonly role: Role,
    public readonly actor: ActorUser,
  ) {}
}

export class UpdateRoleEvent {
  constructor(
    public readonly roleId: string,
    public readonly updates: CreateRoleRequestDto,
    public readonly actor: ActorUser,
  ) {}
}

export class DeleteRoleEvent {
  constructor(
    public readonly roleId: string,
    public readonly actor: ActorUser,
  ) {}
}
