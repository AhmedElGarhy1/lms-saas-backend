import IntlMessageFormat from 'intl-messageformat';
import { I18nContext } from 'nestjs-i18n';

/**
 * Custom formatter for nestjs-i18n using intl-messageformat
 * Provides full ICU message format support including plurals, dates, numbers, etc.
 *
 * @param template - The translation template string with ICU placeholders
 * @param args - Variadic arguments where args[0] is typically the format arguments object
 * @returns Formatted string
 */
export function intlMessageFormatter(
  template: string,
  ...args: (string | Record<string, any>)[]
): string {
  try {
    // Get locale from I18nContext if available
    const i18nContext = I18nContext.current();
    const locale = i18nContext?.lang || 'en';

    // Create IntlMessageFormat instance with the template and locale
    const formatter = new IntlMessageFormat(template, locale);

    // Extract format arguments - nestjs-i18n passes args as the second parameter (first after template)
    // The args can be a Record<string, any> or spread as individual arguments
    // We look for the first object argument that's not a string
    let formatArgs: Record<string, any> = {};

    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
        formatArgs = arg;
        break;
      }
    }

    // Format the message with the provided arguments
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = formatter.format(formatArgs);

    // IntlMessageFormat.format() returns a string or a FormattedMessage object
    // We need to extract the string value
    if (typeof result === 'string') {
      return result;
    }

    // If it's a FormattedMessage, convert to string
    // This handles cases where ICU returns structured values
    return String(result);
  } catch (error) {
    // Fallback to template if formatting fails
    console.error('Error formatting message with intl-messageformat:', error, {
      template,
      args,
    });
    return template;
  }
}
