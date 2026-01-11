import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { AuthErrorCode } from '../enums/auth.codes';

/**
 * Auth-specific error helpers
 * Clean, simple, and maintainable error creation
 */
export class AuthErrors extends BaseErrorHelpers {
  static authenticationFailed(): DomainException {
    return this.createNoDetails(AuthErrorCode.AUTHENTICATION_FAILED, 401);
  }

  static invalidCredentials(): DomainException {
    return this.createNoDetails(AuthErrorCode.INVALID_CREDENTIALS);
  }

  static accountDisabled(): DomainException {
    return this.createNoDetails(AuthErrorCode.ACCOUNT_DISABLED);
  }

  static accountLocked(): DomainException {
    return this.createNoDetails(AuthErrorCode.ACCOUNT_LOCKED);
  }

  static otpRequired(
    type: 'login' | 'setup' | 'disable' = 'login',
  ): DomainException {
    return this.createWithDetails(AuthErrorCode.OTP_REQUIRED, { type });
  }

  static otpInvalid(): DomainException {
    return this.createNoDetails(AuthErrorCode.OTP_INVALID);
  }

  static otpExpired(): DomainException {
    return this.createNoDetails(AuthErrorCode.OTP_EXPIRED);
  }

  static phoneNotVerified(): DomainException {
    return this.createNoDetails(AuthErrorCode.PHONE_NOT_VERIFIED);
  }

  static userNotFound(): DomainException {
    return this.createNoDetails(AuthErrorCode.USER_NOT_FOUND);
  }

  static profileInactive(): DomainException {
    return this.createNoDetails(AuthErrorCode.PROFILE_INACTIVE);
  }

  static sessionExpired(): DomainException {
    return this.createNoDetails(AuthErrorCode.SESSION_EXPIRED);
  }

  static sessionInvalid(): DomainException {
    return this.createNoDetails(AuthErrorCode.SESSION_INVALID);
  }

  // Two-factor authentication specific errors
  static twoFactorNotEnabled(): DomainException {
    return this.createNoDetails(AuthErrorCode.TWO_FACTOR_NOT_ENABLED);
  }

  static twoFactorAlreadyEnabled(): DomainException {
    return this.createNoDetails(AuthErrorCode.TWO_FACTOR_ALREADY_ENABLED);
  }

  static twoFactorAlreadySetup(): DomainException {
    return this.createNoDetails(AuthErrorCode.TWO_FACTOR_ALREADY_SETUP);
  }

  // Validation errors
  static missingUserIdentifier(): DomainException {
    return this.createNoDetails(AuthErrorCode.MISSING_USER_IDENTIFIER);
  }

  static missingPhoneParameter(): DomainException {
    return this.createNoDetails(AuthErrorCode.MISSING_PHONE_PARAMETER);
  }

  static refreshTokenNotFound(): DomainException {
    return this.createNoDetails(AuthErrorCode.REFRESH_TOKEN_NOT_FOUND);
  }

  static authenticationRequired(): DomainException {
    return this.createNoDetails(AuthErrorCode.AUTHENTICATION_REQUIRED);
  }

  // WebSocket authentication errors
  static websocketNoToken(): DomainException {
    return this.createNoDetails(AuthErrorCode.WEBSOCKET_NO_TOKEN);
  }

  static websocketInvalidTokenType(): DomainException {
    return this.createNoDetails(AuthErrorCode.WEBSOCKET_INVALID_TOKEN_TYPE);
  }
}
