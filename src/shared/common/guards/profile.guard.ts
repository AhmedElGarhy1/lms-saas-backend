import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { RequestContext } from '../context/request.context';
import { NOP_PROFILE_KEY } from '../decorators/no-profile.decorator';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { AuthErrors } from '@/modules/auth/exceptions/auth.errors';

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

    // Only apply profile validation to API routes
    if (!request.url.startsWith('/api')) {
      return true;
    }

    const userProfileId = (request.get('x-user-profile-id') ??
      request.userProfileId ??
      (request.body as { userProfileId?: string })?.userProfileId ??
      (request.query as { userProfileId?: string })?.userProfileId) as string;

    const user = request.user;
    if (!user) {
      throw AuthErrors.authenticationRequired();
    }

    user.userProfileId = userProfileId;
    request.user = user;

    // first pass profileId
    if (noProfile) {
      return true;
    }

    if (!userProfileId) {
      throw UserProfileErrors.userProfileSelectionRequired();
    }
    const profile = await this.userProfileService.findForUser(
      user.id,
      userProfileId,
    );
    if (!profile) {
      throw UserProfileErrors.userProfileSelectionRequired();
    }
    if (!profile.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    user.profileType = profile.profileType;
    request.user = user;

    RequestContext.set({
      userProfileId: profile.id,
      userProfileType: profile.profileType,
    });

    return true;
  }
}
