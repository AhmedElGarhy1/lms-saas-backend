import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Config } from '@/shared/config/config';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

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
    private readonly i18n: I18nService<I18nTranslations>,
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
      throw new UnauthorizedException(
        this.i18n.translate('errors.userNotFound'),
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        this.i18n.translate('errors.userAccountInactive'),
      );
    }
    if (!user.phoneVerified) {
      throw new BusinessLogicException(
        this.i18n.translate('errors.userPhoneNotVerified'),
      );
    }

    return user;
  }
}
