import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { UpdateCenterRequestDto } from '@/modules/centers/dto/update-center.dto';
import { CreateBranchDto } from '@/modules/centers/dto/create-branch.dto';

export class CreateCenterEvent {
  constructor(
    public readonly center: Center,
    public readonly actor: ActorUser,
    public readonly userData?: CreateUserDto,
    public readonly branchData?: CreateBranchDto,
  ) {}
}

export class CreateCenterBranchEvent {
  constructor(
    public readonly center: Center,
    public readonly branchData: CreateBranchDto,
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
    public readonly userProfile?: UserProfile,
    public readonly actor?: ActorUser,
  ) {}
}
