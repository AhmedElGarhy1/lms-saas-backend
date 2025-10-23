import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { RequestContext } from '../context/request.context';
import { NOP_PROFILE_KEY } from '../decorators/no-profile.decorator';
import { ProfileSelectionRequiredException } from '../exceptions/custom.exceptions';
import { UserProfileService } from '@/modules/profile/services/user-profile.service';

@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userProfileService: UserProfileService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const noProfile = this.reflector.getAllAndOverride<boolean>(
      NOP_PROFILE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request: IRequest = context.switchToHttp().getRequest();

    const profileId = (request.get('x-profile-id') ??
      request.profileId ??
      (request.body as { profileId?: string })?.profileId ??
      (request.query as { profileId?: string })?.profileId) as string;

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    user.profileId = profileId;
    request.user = user;

    // first pass profileId
    if (noProfile) {
      return true;
    }

    if (!profileId) {
      throw new ProfileSelectionRequiredException();
    }
    const profile = await this.userProfileService.findOne(profileId);
    if (!profile) {
      throw new ProfileSelectionRequiredException();
    }

    RequestContext.set({
      profileId: profile.id,
      profileType: profile.profileType,
    });

    return true;
  }
}
