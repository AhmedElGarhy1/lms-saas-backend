import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserService } from '@/modules/user/services/user.service';
import { I18nTranslations } from '@/generated/i18n.generated';
import { Locale } from '@/shared/common/enums/locale.enum';
import { RequestContext } from '@/shared/common/context/request.context';

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

  getTranslations(lang: string | undefined) {
    const currentLanguage = lang || RequestContext.get().locale;

    return this.loadTranslations(currentLanguage);
  }

  getAvailableLanguages() {
    return Object.values(Locale);
  }
}
