import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RoleScopeEnum } from 'src/access-control/constants/role-scope.enum';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;
    const reqAny = request as any;
    if (user) {
      user.centerId = reqAny.scopeId ?? null;
      user.scope = reqAny.scopeType ?? RoleScopeEnum.GLOBAL;
    }
    return user;
  },
);
