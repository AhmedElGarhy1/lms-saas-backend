import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserService } from '@/modules/user/services/user.service';
import { I18nTranslations } from '@/generated/i18n.generated';
import { Locale } from '@/shared/common/enums/locale.enum';

@Injectable()
export class LocaleService {
  constructor(
    private readonly userService: UserService,
    private readonly i18nService: I18nService<I18nTranslations>,
  ) {}

  private loadTranslations(lang: string): Record<string, any> {
    const i18nTranslations = (this.i18nService as any).translations;

    if (i18nTranslations && i18nTranslations[lang]) {
      return i18nTranslations[lang] as Record<string, any>;
    }
    return {};
  }

  async getTranslations(lang: string | undefined, req: Request) {
    const userLocale = await this.getUserLocale(req);

    const currentLanguage = lang || userLocale;

    return this.loadTranslations(currentLanguage);
  }

  async getUserLocale(req: Request) {
    const i18n = I18nContext.current();
    let locale = i18n?.lang || 'ar';
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return locale;
    }
    const decoded = jwt.decode(accessToken);
    if (decoded) {
      const user = await this.userService.findOne(decoded.sub as string);
      if (user && user.userInfo) {
        locale = user.userInfo.locale;
      }
    }
    return locale;
  }

  getAvailableLanguages() {
    return Object.values(Locale);
  }
}
