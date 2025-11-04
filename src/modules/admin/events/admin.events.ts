import { User } from '@/modules/user/entities/user.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateAdminDto } from '@/modules/admin/dto/create-admin.dto';

export class CreateAdminEvent {
  constructor(
    public readonly dto: CreateAdminDto,
    public readonly actor: ActorUser,
    public readonly admin: Admin,
  ) {}
}
