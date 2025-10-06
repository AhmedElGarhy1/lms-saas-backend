import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ActorUser } from '../types/actor-user.type';

export type { ActorUser as CurrentUser };

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActorUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as ActorUser;

    return user;
  },
);
