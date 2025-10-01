import { Request } from 'express';
import { CurrentUser } from '../types/current-user.type';

export interface IRequest extends Request {
  centerId?: string;
  user: CurrentUser;
}
