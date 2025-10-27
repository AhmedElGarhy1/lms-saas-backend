import { User } from '@/modules/user/entities/user.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateAdminDto } from '@/modules/admin/dto/create-admin.dto';

export enum AdminEvents {
  CREATE = 'admin.create',
  CREATED = 'admin.created',
}

export class AdminCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly admin: Admin,
    public readonly actor: ActorUser,
  ) {}
}

export class CreateAdminEvent {
  constructor(
    public readonly dto: CreateAdminDto,
    public readonly actor: ActorUser,
  ) {}
}
