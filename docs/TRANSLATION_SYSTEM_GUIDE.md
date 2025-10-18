# Translation System Guide

This guide explains how to use the translation system in the LMS backend for internationalization and localized error messages.

## 🎯 Overview

The translation system provides:

- **Centralized translation management** for all backend messages
- **Consistent error responses** with translated user messages
- **Validation message translation** for form errors
- **API response translation** for success and error messages
- **Variable substitution** in translation strings
- **Frontend integration** through locale endpoints

## 🏗️ Architecture

### Core Components

1. **TranslationService** - Main service for translation operations
2. **TranslatedExceptionFactory** - Factory for creating translated exceptions
3. **CustomValidationPipe** - Enhanced validation with translations
4. **LocaleController** - API endpoints for frontend integration
5. **Translation Constants** - Centralized translation keys and values

## 📚 Usage Examples

### 1. Basic Translation

```typescript
import { TranslationService } from '@/modules/locale/services/translation.service';

@Injectable()
export class MyService {
  constructor(private readonly translationService: TranslationService) {}

  getMessage() {
    // Simple translation
    const message = this.translationService.translate(
      'common.messages.success',
    );
    return message; // "Operation successful"
  }
}
```

### 2. Translation with Variables

```typescript
getMessageWithVariables() {
  const message = this.translationService.translate('api.success.create', {
    variables: { resource: 'user' }
  });
  return message; // "Created successfully"
}
```

### 3. API Message Translation

```typescript
getApiMessage() {
  const message = this.translationService.getApiMessage('success', 'create', 'user');
  return message; // "Created successfully"
}
```

### 4. Validation Message Translation

```typescript
getValidationMessage() {
  const message = this.translationService.getValidationMessage('email', 'required');
  return message; // "Email is required"
}
```

### 5. Error Message Translation

```typescript
getErrorMessage() {
  const message = this.translationService.getErrorMessage('RESOURCE_NOT_FOUND', {
    resource: 'user',
    id: '123'
  });
  return message; // "The requested resource was not found"
}
```

## 🚨 Exception Handling with Translations

### Using TranslatedExceptionFactory

```typescript
import { TranslatedExceptionFactory } from '@/shared/common/factories/translated-exception.factory';

@Injectable()
export class MyService {
  constructor(private readonly exceptionFactory: TranslatedExceptionFactory) {}

  throwResourceNotFound() {
    throw this.exceptionFactory.createResourceNotFoundException('user', {
      id: '123',
    });
  }

  throwValidationError() {
    throw this.exceptionFactory.createValidationFailedException([
      {
        field: 'email',
        value: 'invalid-email',
        message: 'Invalid email format',
        code: 'VALIDATION_ERROR' as any,
      },
    ]);
  }

  throwAuthenticationError() {
    throw this.exceptionFactory.createAuthenticationFailedException();
  }

  throwUserExistsError() {
    throw this.exceptionFactory.createUserAlreadyExistsException(
      'test@example.com',
    );
  }
}
```

### Available Exception Methods

- `createResourceNotFoundException(resource, context?)`
- `createValidationFailedException(details, context?)`
- `createAuthenticationFailedException(context?)`
- `createAccessDeniedException(context?)`
- `createInsufficientPermissionsException(context?)`
- `createUserAlreadyExistsException(email, context?)`
- `createBusinessLogicException(message, context?)`
- `createCenterSelectionRequiredException(context?)`
- `createCenterAccessDeniedException(context?)`
- `createInternalServerErrorException(context?)`
- `createException(errorCode, context?, customDetails?)`

## 🔧 Validation with Translations

The `CustomValidationPipe` automatically uses translations for validation errors:

```typescript
// DTO with validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Controller
@Post()
createUser(@Body() createUserDto: CreateUserDto) {
  // Validation errors will be automatically translated
  return this.userService.create(createUserDto);
}
```

## 🌐 Frontend Integration

### Locale Endpoints

The system provides several endpoints for frontend integration:

```typescript
// Get all translations
GET /locale

// Get translation keys
GET /locale/keys

// Get translations by prefix
GET /locale/prefix?prefix=validation.

// Translate specific key
GET /locale/translate?key=validation.required

// Get backend-specific translations
GET /locale/backend
```

### Frontend Usage

```typescript
// Fetch all translations
const translations = await fetch('/api/locale').then((r) => r.json());

// Use in frontend
const errorMessage = translations['errors.RESOURCE_NOT_FOUND'];
const successMessage = translations['api.success.create'];
```

## 📝 Translation Key Structure

### Key Categories

1. **Common Messages** (`common.*`)
   - UI elements, buttons, labels
   - General messages and placeholders

2. **API Messages** (`api.*`)
   - Success and error responses
   - Operation-specific messages

3. **Validation Messages** (`validation.*`)
   - Form validation errors
   - Field-specific messages

4. **Error Messages** (`errors.*`)
   - System error messages
   - Error code translations

5. **Success Messages** (`success.*`)
   - Operation success messages
   - Action confirmations

6. **Action Messages** (`actions.*`)
   - User action guidance
   - Next steps instructions

7. **User Messages** (`userMessages.*`)
   - User-friendly error messages
   - Contextual guidance

8. **System Messages** (`system.*`)
   - System status messages
   - Technical information

### Key Naming Convention

```
category.subcategory.specific
```

Examples:

- `validation.email.required`
- `api.success.create.user`
- `errors.RESOURCE_NOT_FOUND`
- `actions.retry`

## 🔄 Variable Substitution

Translation strings support variable substitution using `{{variable}}` or `{variable}` syntax:

```typescript
// Translation key: "api.success.create"
// Translation value: "{{resource}} created successfully"

const message = this.translationService.translate('api.success.create', {
  variables: { resource: 'User' },
});
// Result: "User created successfully"
```

## 🎨 Adding New Translations

### 1. Add to Translation Constants

```typescript
// src/modules/locale/constants/en.ts
export const mockTranslations: Record<string, string> = {
  // ... existing translations

  // New translation
  'my.new.key': 'My new translation message',
  'my.new.key.with.vars': 'Hello {{name}}, welcome to {{app}}!',
};
```

### 2. Use in Service

```typescript
const message = this.translationService.translate('my.new.key');
const messageWithVars = this.translationService.translate(
  'my.new.key.with.vars',
  {
    variables: { name: 'John', app: 'LMS' },
  },
);
```

### 3. Add to Exception Factory (if needed)

```typescript
// Add new method to TranslatedExceptionFactory
createMyCustomException(context?: Record<string, string | number>): HttpException {
  const userMessage = this.translationService.translate('my.custom.error', { variables: context });
  const actionRequired = this.translationService.translate('my.custom.action', { variables: context });

  return new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: this.translationService.getErrorMessage('MY_CUSTOM_ERROR', context),
      error: 'Bad Request',
      code: ErrorCode.MY_CUSTOM_ERROR,
      timestamp: new Date().toISOString(),
      userMessage,
      actionRequired,
      retryable: true,
    } as EnhancedErrorResponse,
    HttpStatus.BAD_REQUEST,
  );
}
```

## 🧪 Testing

### Unit Testing

```typescript
describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService();
  });

  it('should translate simple key', () => {
    const result = service.translate('common.messages.success');
    expect(result).toBe('Operation successful');
  });

  it('should translate with variables', () => {
    const result = service.translate('api.success.create', {
      variables: { resource: 'user' },
    });
    expect(result).toBe('Created successfully');
  });
});
```

### Integration Testing

```typescript
describe('TranslatedExceptionFactory', () => {
  let factory: TranslatedExceptionFactory;
  let translationService: TranslationService;

  beforeEach(() => {
    translationService = new TranslationService();
    factory = new TranslatedExceptionFactory(translationService);
  });

  it('should create translated resource not found exception', () => {
    const exception = factory.createResourceNotFoundException('user', {
      id: '123',
    });
    expect(exception.getResponse()).toMatchObject({
      userMessage: expect.stringContaining('not found'),
      actionRequired: expect.stringContaining('try again'),
    });
  });
});
```

## 🚀 Best Practices

### 1. Use Descriptive Keys

```typescript
// Good
'validation.email.required';
'api.success.create.user';
'errors.RESOURCE_NOT_FOUND';

// Bad
'msg1';
'error';
'text';
```

### 2. Provide Context

```typescript
// Good
throw this.exceptionFactory.createResourceNotFoundException('user', {
  id: '123',
  operation: 'update',
});

// Bad
throw this.exceptionFactory.createResourceNotFoundException('user');
```

### 3. Use Appropriate Message Types

```typescript
// For user-facing messages
const userMessage = this.translationService.translate(
  'userMessages.validationFailed',
);

// For technical messages
const technicalMessage =
  this.translationService.getErrorMessage('VALIDATION_FAILED');

// For API responses
const apiMessage = this.translationService.getApiMessage('success', 'create');
```

### 4. Handle Missing Translations

```typescript
const message = this.translationService.translate('nonexistent.key', {
  defaultValue: 'Default message',
});
```

### 5. Use Translation Service in Services

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly translationService: TranslationService,
    private readonly exceptionFactory: TranslatedExceptionFactory,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    try {
      const user = await this.userRepository.save(createUserDto);
      return {
        data: user,
        message: this.translationService.getSuccessMessage('create', 'user'),
      };
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw this.exceptionFactory.createUserAlreadyExistsException(
          createUserDto.email,
        );
      }
      throw this.exceptionFactory.createInternalServerErrorException();
    }
  }
}
```

## 🔍 Debugging

### Check Translation Availability

```typescript
const hasTranslation = this.translationService.hasTranslation('my.key');
console.log('Translation exists:', hasTranslation);
```

### Get All Keys

```typescript
const allKeys = this.translationService.getAllKeys();
console.log('Available translations:', allKeys);
```

### Get Translations by Prefix

```typescript
const validationKeys =
  this.translationService.getTranslationsByPrefix('validation.');
console.log('Validation translations:', validationKeys);
```

## 📊 Performance Considerations

1. **Caching**: Translation service loads all translations at startup
2. **Memory**: All translations are kept in memory for fast access
3. **Lookup**: O(1) lookup time for translation keys
4. **Variables**: Variable substitution is done on-demand

## 🔄 Migration from Hardcoded Messages

### Before (Hardcoded)

```typescript
throw new HttpException('User not found', HttpStatus.NOT_FOUND);
```

### After (Translated)

```typescript
throw this.exceptionFactory.createResourceNotFoundException('user', {
  id: '123',
});
```

### Before (Hardcoded Validation)

```typescript
const errorResponse = {
  message: 'Validation failed',
  userMessage: 'Please check your input and try again.',
  actionRequired: 'Fix the highlighted errors below.',
};
```

### After (Translated)

```typescript
const errorResponse = {
  message: this.translationService.getErrorMessage('VALIDATION_FAILED'),
  userMessage: this.translationService.translate(
    'userMessages.validationFailed',
  ),
  actionRequired: this.translationService.translate('actions.fixErrors'),
};
```

## 🎯 Conclusion

The translation system provides a comprehensive solution for internationalizing the LMS backend. It ensures consistent, user-friendly messages across all API responses while maintaining flexibility for customization and extension.

For questions or issues, refer to the translation service documentation or contact the development team.
