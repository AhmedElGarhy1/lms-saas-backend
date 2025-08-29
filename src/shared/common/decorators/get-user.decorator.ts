import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../types/current-user.type';

export type { CurrentUser };

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser;

    return user;
  },
);
