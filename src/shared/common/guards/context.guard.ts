import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RequestContext } from '../context/request.context';
import { NO_CONTEXT_KEY } from '../decorators/no-context.decorator';
import {
  CenterSelectionRequiredException,
  ProfileSelectionRequiredException,
} from '../exceptions/custom.exceptions';
import { UserProfileService } from '@/modules/profile/services/user-profile.service';

@Injectable()
export class ContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userProfileService: UserProfileService,
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
    const profileId = RequestContext.get().profileId;
    const profileType = RequestContext.get().profileType;
    if (!profileId) {
      throw new ProfileSelectionRequiredException();
    }
    if (!profileType) {
      throw new InternalServerErrorException('Profile type not found');
    }

    try {
      await this.accessControlHelperService.validateAdminAndCenterAccess({
        userId: user.id,
        centerId,
        profileType,
      });
    } catch {
      throw new CenterSelectionRequiredException();
    }

    // Set the userId (and maybe centerId) in the request context
    RequestContext.set({
      centerId: user.centerId,
    });

    return true;
  }
}
