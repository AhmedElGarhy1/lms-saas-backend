import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Config } from '@/shared/config/config';
import { AuthErrors } from '../exceptions/auth.errors';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: Config.jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Ensure payload has required sub claim
    if (!payload.sub) {
      // A missing sub claim in JWT is an authentication failure
      throw AuthErrors.authenticationFailed();
    }

    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      // A missing user during JWT validation is an authentication failure
      throw AuthErrors.authenticationFailed();
    }

    if (!user.isActive) {
      throw AuthErrors.accountDisabled();
    }

    // Phone verification is now handled by PhoneVerificationGuard
    // This keeps JWT strategy focused on authentication only

    return user;
  }
}
