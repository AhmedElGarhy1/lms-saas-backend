import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface ScopeRequest {
  scopeType?: unknown;
  centerId?: unknown;
}

export const ContextScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      scopeType:
        typeof request.scopeType === 'string' ? request.scopeType : undefined,
      centerId:
        typeof request.centerId === 'string' ? request.centerId : undefined,
    };
  },
);
