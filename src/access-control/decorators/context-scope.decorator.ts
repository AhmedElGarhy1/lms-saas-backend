import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ContextScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      scopeType: request.scopeType,
      scopeId: request.scopeId,
    };
  },
);
