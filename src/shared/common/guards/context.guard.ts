import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ContextValidationService } from '../services/context-validation.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ContextGuard implements CanActivate {
  constructor(
    private readonly contextValidationService: ContextValidationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Validate context using the service
      await this.contextValidationService.validateContext(
        user.id,
        request.scopeType,
        request.centerId,
      );
      return true;
    } catch (error) {
      throw new ForbiddenException(error.message);
    }
  }
}
