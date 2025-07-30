import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUser {
  id: string;
  email: string;
  centerId?: string;
  scopeType?: string;
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser;

    return {
      id: user?.id || '',
      email: user?.email || '',
      centerId: user?.centerId,
      scopeType: user?.scopeType,
    };
  },
);
