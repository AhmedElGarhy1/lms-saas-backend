import { User } from '@/modules/user/entities/user.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';

export enum StaffEvents {
  PROFILE_CREATE = 'staff.profile.create',
  CREATED = 'staff.created',
  PROFILE_CREATED = 'staff.profile.created',
  ACCESS_SETUP_NEEDED = 'staff.access.setup.needed',
}

export class StaffCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly staff: Staff,
    public readonly actor: ActorUser,
  ) {}
}

export class CreateStaffProfileEvent {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateStaffDto,
    public readonly actor: ActorUser,
  ) {}
}

export class StaffProfileCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly userProfileId: string,
    public readonly staffId: string,
    public readonly dto: CreateStaffDto,
    public readonly actor: ActorUser,
  ) {}
}

export class StaffAccessSetupNeededEvent {
  constructor(
    public readonly userId: string,
    public readonly userProfileId: string,
    public readonly staffId: string,
    public readonly dto: CreateStaffDto,
    public readonly actor: ActorUser,
  ) {}
}
