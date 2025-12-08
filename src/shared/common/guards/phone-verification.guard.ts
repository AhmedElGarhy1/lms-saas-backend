import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { NO_PHONE_VERIFICATION_KEY } from '../decorators/no-phone-verification.decorator';
import { IRequest } from '../interfaces/request.interface';
import { PhoneNotVerifiedException } from '../exceptions/custom.exceptions';

/**
 * Phone Verification Guard
 * Ensures that authenticated users have verified their phone number
 * This guard runs after JWT authentication and checks phone verification status
 */
@Injectable()
export class PhoneVerificationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Check if the endpoint is public (skip phone verification for public routes)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if phone verification is explicitly bypassed for this endpoint
    const noPhoneVerification = this.reflector.getAllAndOverride<boolean>(
      NO_PHONE_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (noPhoneVerification) {
      return true;
    }

    const request: IRequest = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, let JWT guard handle authentication
    // This guard only checks phone verification for authenticated users
    if (!user) {
      return true;
    }

    // Check if user's phone is verified
    if (!user.phoneVerified) {
      throw new PhoneNotVerifiedException('t.messages.phoneNotVerified');
    }

    return true;
  }
}
