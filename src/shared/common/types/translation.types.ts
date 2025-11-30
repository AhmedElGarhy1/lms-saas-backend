import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';

export interface TranslationMessage<P extends I18nPath = I18nPath> {
  key: P;
  args?: PathArgs<P>;
}
