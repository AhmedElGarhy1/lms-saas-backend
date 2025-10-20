import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RequestContext } from '../context/request.context';
import { NO_CONTEXT_KEY } from '../decorators/no-context';
import {
  CenterSelectionRequiredException,
  AdminScopeAccessDeniedException,
} from '../exceptions/custom.exceptions';

@Injectable()
export class ContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const noContext = this.reflector.getAllAndOverride<boolean>(
      NO_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request: IRequest = context.switchToHttp().getRequest();
    const centerId = (request.get('x-center-id') ??
      request.centerId ??
      (request.body as { centerId?: string })?.centerId ??
      (request.query as { centerId?: string })?.centerId) as string;
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    user.centerId = centerId;
    request.user = user;

    // first pass centerId
    if (noContext) {
      return true;
    }

    if (centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userId: user.id,
        centerId,
      });
    } else {
      try {
        await this.accessControlHelperService.validateAdminAccess({
          userId: user.id,
        });
      } catch (error) {
        // If it's an AdminScopeAccessDeniedException, convert it to CenterSelectionRequiredException
        if (error instanceof AdminScopeAccessDeniedException) {
          throw new CenterSelectionRequiredException(
            'Admin user must select a center to access this resource. Please select a center from the available options.',
          );
        }
        // Re-throw other exceptions as-is
        throw error;
      }
    }

    // Set the userId (and maybe centerId) in the request context
    RequestContext.set({
      userId: user.id,
      centerId: user.centerId,
      locale: user.locale,
    });

    return true;
  }
}
