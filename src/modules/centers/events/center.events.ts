import { Center } from '@/modules/centers/entities/center.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { UpdateCenterRequestDto } from '@/modules/centers/dto/update-center.dto';

export enum CenterEvents {
  CREATE = 'center.create',
  UPDATE = 'center.update',
  DELETE = 'center.delete',
  RESTORE = 'center.restore',
  ASSIGN_OWNER = 'center.assign.owner',
}

export class CreateCenterEvent {
  constructor(
    public readonly center: Center,
    public readonly userData: CreateUserDto,
    public readonly actor: ActorUser,
  ) {}
}

export class UpdateCenterEvent {
  constructor(
    public readonly centerId: string,
    public readonly updates: Partial<UpdateCenterRequestDto>,
    public readonly actor: ActorUser,
  ) {}
}

export class DeleteCenterEvent {
  constructor(
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RestoreCenterEvent {
  constructor(
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class AssignCenterOwnerEvent {
  constructor(
    public readonly center: Center,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
  ) {}
}
