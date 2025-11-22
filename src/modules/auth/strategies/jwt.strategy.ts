import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Config } from '@/shared/config/config';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { FailedLoginAttemptService } from '../services/failed-login-attempt.service';

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
  constructor(
    private readonly userRepository: UserRepository,
    private readonly failedLoginAttemptService: FailedLoginAttemptService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: Config.jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }
    if (!user.phoneVerified) {
      throw new BusinessLogicException('User phone is not verified');
    }

    // Check lockout from Redis
    const isLocked = await this.failedLoginAttemptService.isLockedOut(user.id);
    if (isLocked) {
      throw new BusinessLogicException(
        'User account is locked',
        'Your account is locked due to multiple failed login attempts',
        'Please try again later or contact support',
      );
    }

    return user;
  }
}
