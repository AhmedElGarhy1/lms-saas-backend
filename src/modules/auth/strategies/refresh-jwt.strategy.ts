import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Config } from '@/shared/config/config';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

export interface RefreshJwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'refresh';
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface JwtError extends Error {
  name: 'TokenExpiredError' | 'JsonWebTokenError' | 'NotBeforeError';
}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: Config.jwt.secret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request<object, object, RefreshTokenRequest>,
    payload: RefreshJwtPayload,
  ) {
    try {
      // Extract refresh token from request body
      const refreshToken = req.body?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedException(
          this.i18n.translate('errors.refreshTokenNotFound' as any),
        );
      }

      // Validate that this is a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException(
          this.i18n.translate('errors.invalidTokenType'),
        );
      }

      // Get user and verify they have a stored refresh token
      const user = await this.userService.findOne(payload.sub, true);
      if (!user || !user.hashedRt) {
        throw new UnauthorizedException(
          this.i18n.translate('errors.accessDenied'),
        );
      }

      // Compare the provided token with the stored hashed token
      const rtMatches = await bcrypt.compare(refreshToken, user.hashedRt);
      if (!rtMatches) {
        throw new UnauthorizedException(
          this.i18n.translate('errors.invalidOrExpiredToken' as any),
        );
      }

      return {
        ...payload,
        refreshToken,
      };
    } catch (error: unknown) {
      // Handle JWT-specific errors
      const jwtError = error as JwtError;
      if (jwtError?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          this.i18n.translate('errors.refreshTokenExpired' as any),
        );
      } else if (jwtError?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          this.i18n.translate('errors.invalidRefreshToken' as any),
        );
      } else if (jwtError?.name === 'NotBeforeError') {
        throw new UnauthorizedException(
          this.i18n.translate('errors.tokenNotActiveYet' as any),
        );
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        throw new UnauthorizedException(
          this.i18n.translate('errors.tokenValidationFailed' as any),
        );
      }
    }
  }
}
