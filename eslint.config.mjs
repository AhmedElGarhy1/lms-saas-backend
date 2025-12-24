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
    },
  },
  // Allow EventEmitter2 only in TypeSafeEventEmitter service
  {
    files: ['src/shared/services/type-safe-event-emitter.service.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
