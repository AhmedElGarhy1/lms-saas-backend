import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Config } from '@/shared/config/config';
import {
  AuthenticationFailedException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';

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
    // Ensure this is an access token, not a refresh token
    if (payload.type !== 'access') {
      throw new AuthenticationFailedException('t.errors.invalidTokenType');
    }

    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      // Changed from ResourceNotFoundException to AuthenticationFailedException
      // A missing user during JWT validation is an authentication failure, not a 404
      throw new AuthenticationFailedException('t.errors.userNotFound');
    }

    if (!user.isActive) {
      throw new BusinessLogicException('t.errors.userAccountInactive');
    }

    // Phone verification is now handled by PhoneVerificationGuard
    // This keeps JWT strategy focused on authentication only

    return user;
  }
}
