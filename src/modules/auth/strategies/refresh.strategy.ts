import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
}

function isBodyWithRefreshToken(
  body: unknown,
): body is { refreshToken: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'refreshToken' in body &&
    typeof (body as any).refreshToken === 'string'
  );
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    let refreshToken = '';
    if (isBodyWithRefreshToken(req.body)) {
      refreshToken = req.body.refreshToken;
    }
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}
