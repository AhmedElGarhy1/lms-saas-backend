import {
  I18nOptions,
  QueryResolver,
  AcceptLanguageResolver,
  I18nJsonLoader,
} from 'nestjs-i18n';
import { join } from 'path';
import { UserLocaleResolver } from '../shared/resolvers/user-locale.resolver';

export enum Locale {
  EN = 'en',
  AR = 'ar',
}

export const i18nConfig: I18nOptions = {
  fallbackLanguage: Locale.EN,
  loader: I18nJsonLoader,
  loaderOptions: {
    path: join(__dirname, '../i18n/'),
    watch: true,
    includeSubfolders: true,
  },
  typesOutputPath: join(__dirname, '../generated/i18n.generated.ts'),
  resolvers: [
    { use: QueryResolver, options: ['lang'] },
    UserLocaleResolver,
    AcceptLanguageResolver,
  ],
};
