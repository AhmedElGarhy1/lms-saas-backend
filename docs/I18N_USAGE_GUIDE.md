# 🌍 Advanced I18n Usage Guide

This guide covers the complete internationalization system implemented using `nestjs-i18n` with advanced features.

## 🚀 Quick Start

### Basic Translation
```typescript
import { t } from '@/shared/utils/advanced-i18n.util';

// Simple translation
const message = t('common.messages.welcome', { args: { name: 'John' } });
// Result: "Welcome, John!" (EN) or "مرحباً، John!" (AR)
```

### Pluralization
```typescript
import { tPlural } from '@/shared/utils/advanced-i18n.util';

// Handle different plural forms
const itemCount = tPlural('common.messages.itemCount', 5);
// Result: "5 items" (EN) or "5 عناصر" (AR)
```

### Variable Formatting
```typescript
import { tFormat, formatCurrency, formatDate } from '@/shared/utils/advanced-i18n.util';

// Currency formatting
const balance = tFormat('common.messages.balance', {
  args: { amount: 1234.56 },
  formatters: { currency: { currency: 'USD' } }
});
// Result: "Balance: $1,234.56" (EN) or "الرصيد: ١٬٢٣٤٫٥٦ US$" (AR)
```

## 🎯 Available Functions

### Core Translation Functions
- `t(key, options)` - Basic translation with type safety
- `tNested(category, key, options)` - Nested translation access
- `tFormat(key, options)` - Translation with variable formatting
- `tPlural(key, count, options)` - Translation with pluralization

### Convenience Functions
- `tCommon(key, options)` - Common translations
- `tError(key, options)` - Error messages
- `tSuccess(key, options)` - Success messages
- `tValidation(key, options)` - Validation messages
- `tApi(key, options)` - API messages
- `tSystem(key, options)` - System messages
- `tTable(key, options)` - Table translations
- `tPagination(key, options)` - Pagination translations
- `tUserMessages(key, options)` - User messages
- `tActions(key, options)` - Action translations

### Formatting Functions
- `formatNumber(value, options)` - Locale-aware number formatting
- `formatDate(value, options)` - Locale-aware date formatting
- `formatCurrency(value, currency, options)` - Locale-aware currency formatting
- `getPluralForm(count, options)` - Get plural form for a number

### Utility Functions
- `getCurrentLanguage()` - Get current active language
- `getAvailableLanguages()` - Get all supported languages
- `isLanguageSupported(lang)` - Check if language is supported

## 🌍 Language Support

### Currently Supported Languages
- **English (en)** - Complete with advanced formatting
- **Arabic (ar)** - Complete with RTL support and proper pluralization

### Adding New Languages
1. Create new directory: `src/i18n/{lang}/`
2. Add JSON translation files: `common.json`, `errors.json`, etc.
3. Update `Locale` enum in `src/i18n/i18n.config.ts`
4. Restart the application

## 📁 Translation File Structure

```
src/i18n/
├── en/
│   └── json/
│       ├── common.json      # Common UI elements
│       ├── errors.json      # Error messages
│       ├── success.json     # Success messages
│       ├── validation.json  # Validation messages
│       ├── api.json         # API messages
│       ├── actions.json     # Action buttons
│       ├── userMessages.json # User-facing messages
│       ├── system.json      # System messages
│       ├── table.json       # Table translations
│       └── pagination.json  # Pagination translations
└── ar/
    └── json/
        └── [same structure as en]
```

## 🔧 Advanced Features

### Variable Substitution
```typescript
// Translation file: "welcome": "Welcome, {name}!"
const message = t('common.messages.welcome', { args: { name: 'Alice' } });
// Result: "Welcome, Alice!"
```

### Pluralization Rules
```typescript
// Translation file: "itemCount": "{count, plural, =0 {No items} =1 {One item} other {# items}}"
const count0 = tPlural('common.messages.itemCount', 0); // "No items"
const count1 = tPlural('common.messages.itemCount', 1); // "One item"
const count5 = tPlural('common.messages.itemCount', 5); // "5 items"
```

### Date Formatting
```typescript
// Translation file: "lastLogin": "Last login: {date, date, short}"
const lastLogin = tFormat('common.messages.lastLogin', {
  args: { date: new Date() },
  formatters: { date: { dateStyle: 'short' } }
});
// Result: "Last login: 12/25/2023"
```

### Currency Formatting
```typescript
// Translation file: "balance": "Balance: {amount, number, currency}"
const balance = tFormat('common.messages.balance', {
  args: { amount: 1234.56 },
  formatters: { currency: { currency: 'USD' } }
});
// Result: "Balance: $1,234.56"
```

## 🎛️ Language Resolution

The system uses a resolver chain to determine the active language:

1. **Query Parameter**: `?lang=en` or `?lang=ar`
2. **User Locale**: From authenticated user's profile (`user.locale`)
3. **Accept-Language Header**: Browser's preferred language
4. **Fallback**: English (en)

## 🔌 Integration Points

### Controllers
```typescript
import { t } from '@/shared/utils/advanced-i18n.util';

@Controller('users')
export class UserController {
  @Get()
  findAll() {
    return {
      message: t('success.dataRetrieved'),
      data: users
    };
  }
}
```

### Services
```typescript
import { tError } from '@/shared/utils/advanced-i18n.util';

@Injectable()
export class UserService {
  async findOne(id: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException(tError('RESOURCE_NOT_FOUND'));
    }
    return user;
  }
}
```

### Exception Handling
```typescript
import { tError } from '@/shared/utils/advanced-i18n.util';

// In exception filters
const errorMessage = tError('VALIDATION_FAILED');
```

## 🧪 Testing

### Unit Tests
```typescript
import { AdvancedI18nService } from '@/shared/services/advanced-i18n.service';

describe('AdvancedI18nService', () => {
  it('should translate with variables', () => {
    const result = service.translate('common.messages.welcome', {
      args: { name: 'John' }
    });
    expect(result).toBe('Welcome, John!');
  });
});
```

### E2E Tests
```typescript
describe('I18n System (e2e)', () => {
  it('should return English translations by default', () => {
    return request(app.getHttpServer())
      .get('/locale')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.common.buttons.save).toBe('Save');
      });
  });
});
```

## 🚀 Performance Considerations

- **Lazy Loading**: Translations are loaded on demand
- **Caching**: Built-in caching by `nestjs-i18n`
- **Type Safety**: Compile-time type checking prevents runtime errors
- **Tree Shaking**: Only used translations are included in the bundle

## 🔍 Debugging

### Enable Debug Logging
```typescript
// In your service
const result = t('common.messages.welcome', { 
  args: { name: 'John' },
  lang: 'ar' // Force specific language for testing
});
```

### Check Current Language
```typescript
import { getCurrentLanguage } from '@/shared/utils/advanced-i18n.util';

console.log('Current language:', getCurrentLanguage());
```

## 📈 Best Practices

1. **Use Type Safety**: Always use the generated types
2. **Consistent Naming**: Follow the established key naming conventions
3. **Fallback Values**: Always provide default values for missing translations
4. **Test All Languages**: Ensure all features work in all supported languages
5. **Performance**: Use lazy loading and caching effectively
6. **Documentation**: Document new translation keys and their usage

## 🆘 Troubleshooting

### Common Issues

1. **Translation Not Found**: Check if the key exists in all language files
2. **Type Errors**: Ensure `i18n.generated.ts` is up to date
3. **Language Not Switching**: Check the resolver chain configuration
4. **Formatting Issues**: Verify the formatting options are correct

### Getting Help

- Check the [nestjs-i18n documentation](https://nestjs-i18n.com/)
- Review the generated types in `generated/i18n.generated.ts`
- Test with the example endpoints in `/examples/i18n`
