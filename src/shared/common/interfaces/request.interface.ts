import { Request } from 'express';
import { ActorUser } from '../types/actor-user.type';

export interface IRequest extends Request {
  centerId?: string;
  user: ActorUser;
}
