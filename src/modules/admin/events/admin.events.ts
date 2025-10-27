import { User } from '@/modules/user/entities/user.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateAdminDto } from '@/modules/admin/dto/create-admin.dto';

export enum AdminEvents {
  PROFILE_CREATE = 'admin.profile.create',
  CREATED = 'admin.created',
  PROFILE_CREATED = 'admin.profile.created',
  ACCESS_SETUP_NEEDED = 'admin.access.setup.needed',
}

export class AdminCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly admin: Admin,
    public readonly actor: ActorUser,
  ) {}
}

export class CreateAdminProfileEvent {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateAdminDto,
    public readonly actor: ActorUser,
  ) {}
}

export class AdminProfileCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly userProfileId: string,
    public readonly adminId: string,
    public readonly dto: CreateAdminDto,
    public readonly actor: ActorUser,
  ) {}
}

export class AdminAccessSetupNeededEvent {
  constructor(
    public readonly userId: string,
    public readonly userProfileId: string,
    public readonly adminId: string,
    public readonly dto: CreateAdminDto,
    public readonly actor: ActorUser,
  ) {}
}
