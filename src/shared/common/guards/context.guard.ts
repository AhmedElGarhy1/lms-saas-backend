import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RequestContext } from '../context/request.context';
import { NO_CONTEXT_KEY } from '../decorators/no-context.decorator';
import { ProfileSelectionRequiredException } from '../exceptions/custom.exceptions';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { DEFAULT_TIMEZONE } from '../constants/timezone.constants';

@Injectable()
export class ContextGuard implements CanActivate {
  private readonly logger = new Logger(ContextGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlHelperService: AccessControlHelperService,
    @Inject(forwardRef(() => CentersRepository))
    private readonly centersRepository: CentersRepository,
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

    // Only apply context validation to API routes
    if (!request.url.startsWith('/api')) {
      return true;
    }

    // const centerId = (request.get('x-center-id') ??
    //   request.centerId ??
    //   (request.body as { centerId?: string })?.centerId ??
    //   (request.query as { centerId?: string })?.centerId) as string;

    const centerId = (request.get('x-center-id') ?? request.centerId) as string;

    // Extract branchId from params, query, or body (priority: params > query > body)
    const branchId =
      (request.params as { branchId?: string })?.branchId ??
      (request.query as { branchId?: string })?.branchId ??
      (request.body as { branchId?: string })?.branchId;

    const user = request.user;
    if (!user) {
      throw new ForbiddenException({
        message: { key: 't.messages.notAuthenticated' },
      });
    }
    user.centerId = centerId;

    request.user = user;

    // first pass centerId
    if (noContext) {
      return true;
    }
    const { userProfileId, userProfileType } = RequestContext.get();
    if (!userProfileId) {
      throw new ProfileSelectionRequiredException('t.messages.fieldRequired', {
        field: 't.resources.profileSelection',
      });
    }
    if (!userProfileType) {
      throw new InternalServerErrorException({
        message: {
          key: 't.messages.notFound',
          args: { resource: 't.resources.profileType' },
        },
      });
    }

    await this.accessControlHelperService.validateAdminAndCenterAccess({
      userProfileId,
      centerId,
    });

    // Fetch center to get timezone
    let timezone = DEFAULT_TIMEZONE;
    if (centerId) {
      try {
        const center = await this.centersRepository.findById(centerId);
        if (center?.timezone) {
          timezone = center.timezone;
        } else {
          this.logger.warn(
            `Center ${centerId} found but has no timezone set, using default: ${DEFAULT_TIMEZONE}`,
          );
        }
      } catch (error) {
        // If center not found or error, use default timezone
        // This ensures the guard doesn't fail if center lookup fails
        this.logger.warn(
          `Failed to fetch center timezone for centerId: ${centerId}, using default: ${DEFAULT_TIMEZONE}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    // Set the userId, centerId, branchId, and timezone in the request context
    RequestContext.set({
      centerId: user.centerId,
      branchId,
      timezone,
    });

    return true;
  }
}
