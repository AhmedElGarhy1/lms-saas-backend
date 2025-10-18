import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '../../../generated/i18n.generated';

/**
 * Type alias for I18nService with full type safety
 * Usage:
 * - Import: import { TypedI18nService } from '@/shared/types/i18n.types';
 * - Inject: constructor(private readonly i18n: TypedI18nService) {}
 */
export type TypedI18nService = I18nService<I18nTranslations>;
