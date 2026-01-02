import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequest } from '../interfaces/request.interface';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RequestContext } from '../context/request.context';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { DEFAULT_TIMEZONE } from '../constants/timezone.constants';
import { ProfileType } from '../enums/profile-type.enum';
import { STUDENT_ONLY_KEY } from '../decorators/student-only.decorator';
import { TEACHER_ONLY_KEY } from '../decorators/teacher-only.decorator';
import { PARENT_ONLY_KEY } from '../decorators/parent-only.decorator';
import { STAFF_ONLY_KEY } from '../decorators/staff-only.decorator';
import { MANAGERIAL_ONLY_KEY } from '../decorators/managerial-only.decorator';
import { NOP_PROFILE_KEY } from '../decorators/no-profile.decorator';
import { NO_CONTEXT_KEY } from '../decorators/no-context';
import { CommonErrors } from '../exceptions/common.errors';
import { SystemErrors } from '../exceptions/system.exception';
import { AccessControlErrors } from '@/modules/access-control/exceptions/access-control.errors';
import { AuthErrors } from '@/modules/auth/exceptions/auth.errors';

@Injectable()
export class ContextGuard implements CanActivate {
  private readonly logger = new Logger(ContextGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlHelperService: AccessControlHelperService,
    @Inject(forwardRef(() => CentersRepository))
    private readonly centersRepository: CentersRepository,
    @Inject(forwardRef(() => BranchAccessService))
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: IRequest = context.switchToHttp().getRequest();
    const centerId = (request.get('x-center-id') ?? request.centerId) as string;
    const branchId = (request.get('x-branch-id') ?? request.branchId) as string;

    // Validate centerId format if provided
    if (centerId && !isUUID(centerId)) {
      throw CommonErrors.validationFailed('center_id', centerId);
    }

    // Validate branchId format if provided
    if (branchId && !isUUID(branchId)) {
      throw CommonErrors.validationFailed('branch_id', branchId);
    }

    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const isNoProfile = this.reflector.getAllAndOverride<boolean>(
      NOP_PROFILE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isNoProfile) {
      return true;
    }

    const noContext = this.reflector.getAllAndOverride<boolean>(
      NO_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (noContext) {
      return true;
    }

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

    const user = request.user;
    if (!user) {
      throw AuthErrors.authenticationRequired();
    }

    user.centerId = centerId;
    user.branchId = branchId;

    request.user = user;

    const { userProfileId, userProfileType } = RequestContext.get();
    if (!userProfileId) {
      throw UserProfileErrors.userProfileSelectionRequired();
    }

    if (!userProfileType) {
      throw SystemErrors.internalServerError({
        operation: 'context_validation',
        error: 'profile_type_missing',
      });
    }

    // Validate profile-specific access
    await this.validateProfileSpecificAccess({
      userProfileId,
      userProfileType,
      centerId,
      branchId,
      studentOnly,
      teacherOnly,
      parentOnly,
      staffOnly,
      managerialOnly,
    });

    // Handle timezone for center-based users (staff/admin)
    await this.setCenterTimezone(centerId);

    // Set the userId, centerId, branchId in the request context
    RequestContext.set({
      centerId: user.centerId,
      branchId: branchId,
    });

    return true;
  }

  private async validateProfileSpecificAccess({
    userProfileId,
    userProfileType,
    centerId,
    branchId,
    studentOnly,
    teacherOnly,
    parentOnly,
    staffOnly,
    managerialOnly,
  }: {
    userProfileId: string;
    userProfileType: ProfileType;
    centerId?: string;
    branchId?: string;
    studentOnly?: boolean;
    teacherOnly?: boolean;
    parentOnly?: boolean;
    staffOnly?: boolean;
    managerialOnly?: boolean;
  }) {
    // Check profile-specific restrictions
    if (studentOnly && userProfileType !== ProfileType.STUDENT) {
      throw AccessControlErrors.missingPermission('STUDENT_ACCESS');
    }
    if (teacherOnly && userProfileType !== ProfileType.TEACHER) {
      throw AccessControlErrors.missingPermission('TEACHER_ACCESS');
    }
    if (parentOnly && userProfileType !== ProfileType.PARENT) {
      throw AccessControlErrors.missingPermission('PARENT_ACCESS');
    }
    if (staffOnly && userProfileType !== ProfileType.STAFF) {
      throw AccessControlErrors.missingPermission('STAFF_ACCESS');
    }
    if (
      managerialOnly &&
      userProfileType !== ProfileType.STAFF &&
      userProfileType !== ProfileType.ADMIN
    ) {
      throw AccessControlErrors.missingPermission('MANAGERIAL_ACCESS');
    }

    if (
      userProfileType === ProfileType.STAFF ||
      userProfileType === ProfileType.ADMIN
    ) {
      await this.accessControlHelperService.validateAdminAndCenterAccess({
        userProfileId,
        centerId,
      });

      // Validate branch access if branchId is provided
      if (branchId && centerId) {
        await this.branchAccessService.validateBranchAccess({
          userProfileId,
          centerId,
          branchId,
        });
      }
    }
  }

  private async setCenterTimezone(centerId: string) {
    let timezone = DEFAULT_TIMEZONE;
    if (centerId) {
      const center = await this.centersRepository.findById(centerId);
      if (center?.timezone) {
        timezone = center.timezone;
      }
    }

    RequestContext.set({ timezone });
  }
}
