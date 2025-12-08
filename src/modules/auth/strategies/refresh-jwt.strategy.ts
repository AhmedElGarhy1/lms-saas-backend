import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Config } from '@/shared/config/config';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import * as bcrypt from 'bcrypt';
import {
  AuthenticationFailedException,
  AccessDeniedException,
} from '@/shared/common/exceptions/custom.exceptions';

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
        throw new AuthenticationFailedException('t.messages.notFound', {
          resource: 't.resources.refreshToken',
        });
      }

      // Validate that this is a refresh token
      if (payload.type !== 'refresh') {
        throw new AuthenticationFailedException('t.messages.fieldInvalid', {
          field: 't.resources.tokenType',
        });
      }

      // Get user and verify they have a stored refresh token
      const user = await this.userService.findOne(payload.sub, true);
      if (!user || !user.hashedRt) {
        throw new AccessDeniedException('t.messages.accessDenied', {
          resource: 't.resources.refreshToken',
        });
      }

      // Compare the provided token with the stored hashed token
      const rtMatches = await bcrypt.compare(refreshToken, user.hashedRt);
      if (!rtMatches) {
        throw new AuthenticationFailedException(
          't.messages.fieldInvalidOrExpired',
          {
            field: 'token',
          },
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
        throw new AuthenticationFailedException('t.messages.expired', {
          resource: 't.resources.refreshToken',
        });
      } else if (jwtError?.name === 'JsonWebTokenError') {
        throw new AuthenticationFailedException('t.messages.fieldInvalid', {
          field: 'refresh token',
        });
      } else if (jwtError?.name === 'NotBeforeError') {
        throw new AuthenticationFailedException('t.messages.operationError', {
          reason: 'token is not active yet',
        });
      } else if (error instanceof AuthenticationFailedException) {
        throw error;
      } else {
        throw new AuthenticationFailedException('t.messages.validationFailed');
      }
    }
  }
}
