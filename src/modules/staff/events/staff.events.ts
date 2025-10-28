import { User } from '@/modules/user/entities/user.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';

export enum StaffEvents {
  CREATE = 'staff.create',
}

export class CreateStaffEvent {
  constructor(
    public readonly dto: CreateStaffDto,
    public readonly actor: ActorUser,
  ) {}
}
