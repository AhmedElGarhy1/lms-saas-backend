import { Injectable } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { Locale } from '../common/enums/locale.enum';
import { RequestContext } from '../common/context/request.context';

@Injectable()
export class UserLocaleResolver implements I18nResolver {
  constructor() {}

  resolve(): string {
    const locale = RequestContext.get().locale;
    return locale || Locale.EN;
  }
}
