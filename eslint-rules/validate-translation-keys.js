const fs = require('fs');
const path = require('path');

/**
 * Flatten nested object keys to dot notation
 * Includes both intermediate paths and leaf values
 */
function flattenKeys(obj, prefix = 't', result = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    // Add the current key (intermediate or leaf)
    result.add(fullKey);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      flattenKeys(value, fullKey, result);
    }
  }
  return result;
}

/**
 * Load valid I18nPath keys from translation files
 */
function loadValidI18nPaths() {
  const validPaths = new Set();
  const i18nEnPath = path.join(__dirname, '../src/i18n/en/t.json');

  if (fs.existsSync(i18nEnPath)) {
    try {
      const i18nContent = JSON.parse(fs.readFileSync(i18nEnPath, 'utf-8'));
      flattenKeys(i18nContent, 't', validPaths);
    } catch (error) {
      // Silently fail - ESLint will still work, just won't validate translation keys
      // This prevents build failures if translation file is temporarily missing
    }
  }

  return validPaths;
}

// Cache valid paths (loaded once per ESLint run)
let validI18nPaths = null;

function getValidI18nPaths() {
  if (validI18nPaths === null) {
    validI18nPaths = loadValidI18nPaths();
  }
  return validI18nPaths;
}

/**
 * Check if a string looks like a translation key (contains dots)
 */
function looksLikeTranslationKey(value) {
  return typeof value === 'string' && value.includes('.');
}

/**
 * Check if we're in a translation argument context
 */
function isInTranslationContext(node) {
  let current = node.parent;
  let depth = 0;
  const maxDepth = 15;

  while (current && depth < maxDepth) {
    // Check if we're in an object literal property
    if (current.type === 'Property' && current.value === node) {
      const parentObject = current.parent;
      if (parentObject?.type === 'ObjectExpression') {
        const grandParent = parentObject.parent;

        if (grandParent) {
          // Check for translation service calls
          if (grandParent.type === 'CallExpression') {
            const callee = grandParent.callee;
            if (
              callee &&
              (callee.name === 'translate' ||
                callee.name === 'translateWithLocale' ||
                callee.property?.name === 'translate' ||
                callee.property?.name === 'translateWithLocale')
            ) {
              return true;
            }
          }

          // Check for translatable exceptions
          if (grandParent.type === 'NewExpression') {
            const callee = grandParent.callee;
            // For NewExpression, callee is typically an Identifier
            const calleeName = callee?.name;
            if (
              calleeName &&
              (calleeName.includes('Exception') ||
                calleeName.includes('Error') ||
                calleeName === 'ResourceNotFoundException' ||
                calleeName === 'BusinessLogicException' ||
                calleeName === 'ResourceAlreadyExistsException' ||
                calleeName === 'AccessDeniedException' ||
                calleeName === 'BranchAccessDeniedException')
            ) {
              return true;
            }
          }

          // Check if it's a property of a translation-related object
          if (
            grandParent.type === 'Property' &&
            (grandParent.key?.name === 'translationArgs' ||
              grandParent.key?.name === 'args')
          ) {
            return true;
          }
        }
      }
    }

    current = current.parent;
    depth++;
  }

  return false;
}

module.exports = {
  rules: {
    'validate-translation-keys': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce that dot-separated strings in translation arguments are valid I18nPath values',
          recommended: 'error',
        },
        messages: {
          invalidTranslationKey:
            'String "{{value}}" contains dots but is not a valid I18nPath. If this is a translation key, it must exist in translation files. If this is plain text, remove the dots or use a different format.',
        },
        schema: [],
      },
      create(context) {
        const validPaths = getValidI18nPaths();

        return {
          Literal(node) {
            if (typeof node.value !== 'string') return;

            const value = node.value;

            // Only check strings that look like translation keys (contain dots)
            if (!looksLikeTranslationKey(value)) return;

            // Only check in translation argument contexts
            if (!isInTranslationContext(node)) return;

            // Check if it's a valid I18nPath
            if (!validPaths.has(value)) {
              context.report({
                node,
                messageId: 'invalidTranslationKey',
                severity: 2, // Explicitly set to error (2 = error, 1 = warn, 0 = off)
                data: {
                  value,
                },
              });
            }
          },
        };
      },
    },
  },
};

