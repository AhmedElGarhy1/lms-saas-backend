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
import { ProfileType } from '../enums/profile-type.enum';
import { STUDENT_ONLY_KEY } from '../decorators/student-only.decorator';
import { TEACHER_ONLY_KEY } from '../decorators/teacher-only.decorator';
import { PARENT_ONLY_KEY } from '../decorators/parent-only.decorator';
import { STAFF_ONLY_KEY } from '../decorators/staff-only.decorator';
import { MANAGERIAL_ONLY_KEY } from '../decorators/managerial-only.decorator';

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

    // Check profile-specific decorators
    const studentOnly = this.reflector.getAllAndOverride<boolean>(
      STUDENT_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const teacherOnly = this.reflector.getAllAndOverride<boolean>(
      TEACHER_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const parentOnly = this.reflector.getAllAndOverride<boolean>(
      PARENT_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const staffOnly = this.reflector.getAllAndOverride<boolean>(
      STAFF_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const managerialOnly = this.reflector.getAllAndOverride<boolean>(
      MANAGERIAL_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

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

    // Validate profile-specific access
    await this.validateProfileSpecificAccess({
      userProfileId,
      userProfileType,
      centerId,
      studentOnly,
      teacherOnly,
      parentOnly,
      staffOnly,
      managerialOnly,
    });

    // Handle timezone for center-based users (staff/admin)
    if (
      centerId &&
      (staffOnly ||
        managerialOnly ||
        (!studentOnly && !teacherOnly && !parentOnly))
    ) {
      await this.setCenterTimezone(centerId);
    } else {
      // For non-center users, set default timezone
      RequestContext.set({ timezone: DEFAULT_TIMEZONE });
    }

    // Set the userId, centerId, branchId in the request context
    RequestContext.set({
      centerId: user.centerId,
      branchId,
    });

    return true;
  }

  private async validateProfileSpecificAccess({
    userProfileId,
    userProfileType,
    centerId,
    studentOnly,
    teacherOnly,
    parentOnly,
    staffOnly,
    managerialOnly,
  }: {
    userProfileId: string;
    userProfileType: ProfileType;
    centerId?: string;
    studentOnly?: boolean;
    teacherOnly?: boolean;
    parentOnly?: boolean;
    staffOnly?: boolean;
    managerialOnly?: boolean;
  }) {
    // Check profile-specific restrictions
    if (studentOnly && userProfileType !== ProfileType.STUDENT) {
      throw new ForbiddenException({
        message: { key: 't.messages.accessDenied' },
      });
    }
    if (teacherOnly && userProfileType !== ProfileType.TEACHER) {
      throw new ForbiddenException({
        message: { key: 't.messages.accessDenied' },
      });
    }
    if (parentOnly && userProfileType !== ProfileType.PARENT) {
      throw new ForbiddenException({
        message: { key: 't.messages.accessDenied' },
      });
    }
    if (staffOnly && userProfileType !== ProfileType.STAFF) {
      throw new ForbiddenException({
        message: { key: 't.messages.accessDenied' },
      });
    }
    if (
      managerialOnly &&
      userProfileType !== ProfileType.STAFF &&
      userProfileType !== ProfileType.ADMIN
    ) {
      throw new ForbiddenException({
        message: { key: 't.messages.accessDenied' },
      });
    }

    // For users who need center access (staff/admin or general access), validate center access
    const requiresCenterAccess =
      staffOnly ||
      managerialOnly ||
      (!studentOnly && !teacherOnly && !parentOnly);

    if (requiresCenterAccess) {
      if (!centerId) {
        throw new ForbiddenException({
          message: { key: 't.messages.centerIdRequired' },
        });
      }

      await this.accessControlHelperService.validateAdminAndCenterAccess({
        userProfileId,
        centerId,
      });
    }
    // For students, teachers, parents - no center access validation needed
  }

  private async setCenterTimezone(centerId: string) {
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

    RequestContext.set({ timezone });
  }
}
