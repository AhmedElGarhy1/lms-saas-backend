// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import validateTranslationKeys from './eslint-rules/validate-translation-keys.js';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'validate-translation-keys': validateTranslationKeys,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'validate-translation-keys/validate-translation-keys': 'error',
      // Prevent direct usage of EventEmitter2 - must use TypeSafeEventEmitter instead
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@nestjs/event-emitter',
              importNames: ['EventEmitter2'],
              message:
                'Direct usage of EventEmitter2 is not allowed. Use TypeSafeEventEmitter service instead for type-safe event emissions. Inject TypeSafeEventEmitter in your constructor instead of EventEmitter2.',
            },
          ],
        },
      ],
      // Ban native Date constructor - force TimezoneService usage
      // Note: Date.now() is allowed for performance timing (returns number, not Date object)
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'Direct usage of Date constructor (new Date()) is not allowed. Use TimezoneService.getZonedNow(timezone) for "now" or TimezoneService methods for conversions. For performance timing, use Date.now() with eslint-disable comment.',
        },
      ],
    },
  },
  // Allow EventEmitter2 only in TypeSafeEventEmitter service
  {
    files: ['src/shared/services/type-safe-event-emitter.service.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Allow Date constructor only in TimezoneService
  {
    files: ['src/shared/common/services/timezone.service.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
);
