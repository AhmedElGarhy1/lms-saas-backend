import { Request } from 'express';
import { ActorUser } from '../types/actor-user.type';

export interface IRequest extends Request {
  centerId?: string;
  branchId?: string;
  userProfileId?: string;
  user: ActorUser;
  actor?: ActorUser;
  correlationId?: string;
  requestId?: string;
  webhookIdempotency?: any;
  rawBody?: Buffer;
  id?: string;
}
