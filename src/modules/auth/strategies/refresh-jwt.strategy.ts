import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Config } from '@/shared/config/config';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import * as bcrypt from 'bcrypt';
import { AuthErrors } from '../exceptions/auth.errors';
import { CommonErrors } from '@/shared/common/exceptions/common.errors';
import { DomainException } from '@/shared/common/exceptions/domain.exception';

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
        throw AuthErrors.invalidCredentials();
      }

      // Validate that this is a refresh token
      if (payload.type !== 'refresh') {
        throw AuthErrors.invalidCredentials();
      }

      // Get user and verify they have a stored refresh token
      const user = await this.userService.findOne(payload.sub, true);
      if (!user || !user.hashedRt) {
        throw AuthErrors.refreshTokenNotFound();
      }

      // Compare the provided token with the stored hashed token
      const rtMatches = await bcrypt.compare(refreshToken, user.hashedRt);
      if (!rtMatches) {
        throw AuthErrors.invalidCredentials();
      }

      return {
        ...payload,
        refreshToken,
      };
    } catch (error: unknown) {
      // Handle JWT-specific errors
      const jwtError = error as JwtError;
      if (jwtError?.name === 'TokenExpiredError') {
        throw AuthErrors.sessionExpired();
      } else if (jwtError?.name === 'JsonWebTokenError') {
        throw AuthErrors.invalidCredentials();
      } else if (jwtError?.name === 'NotBeforeError') {
        throw AuthErrors.invalidCredentials();
      } else if (error instanceof DomainException) {
        throw error;
      } else {
        throw AuthErrors.invalidCredentials();
      }
    }
  }
}
