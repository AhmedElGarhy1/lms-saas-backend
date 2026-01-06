import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DomainErrors } from '../exceptions/domain.exception';

@Injectable()
@ValidatorConstraint({ name: 'cannotTargetSelf', async: false })
export class CannotTargetSelfConstraint implements ValidatorConstraintInterface {
  validate(targetUserId: string, args: ValidationArguments): boolean {
    // Get current user from request context
    const request = (args.object as any).request ||
                   (args.object as any).__request ||
                   this.getRequestFromExecutionContext();

    const currentUserId = request?.user?.userProfileId;

    if (!currentUserId) {
      // If we can't determine current user, allow validation to pass
      // This prevents blocking operations when user context is unavailable
      return true;
    }

    // Check if user is targeting themselves
    if (targetUserId === currentUserId) {
      throw DomainErrors.cannotTargetSelf(args.property);
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Cannot perform operation on yourself`;
  }

  private getRequestFromExecutionContext(): any {
    // This is a fallback - ideally the request should be injected via the DTO
    // For now, we'll try to get it from various places
    try {
      const { RequestContext } = require('@nestjs/microservices');
      const ctx = RequestContext.current();
      return ctx?.request;
    } catch {
      return null;
    }
  }
}
