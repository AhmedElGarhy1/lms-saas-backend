import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface ScopeRequest {
  scopeType?: unknown;
  scopeId?: unknown;
}

export const ContextScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as Partial<ScopeRequest>;
    return {
      scopeType:
        typeof request.scopeType === 'string' ? request.scopeType : undefined,
      scopeId:
        typeof request.scopeId === 'string' ? request.scopeId : undefined,
    };
  },
);
