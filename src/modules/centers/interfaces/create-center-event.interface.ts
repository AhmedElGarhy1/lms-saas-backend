import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Center } from '../entities/center.entity';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';

export interface CreateCenterEvent {
  center: Center;
  actor: ActorUser;
  userDto: CreateUserDto;
}
