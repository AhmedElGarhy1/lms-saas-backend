import { NotificationValidator } from '../src/modules/notifications/validator/notification-validator.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('ManifestValidatorScript');

/**
 * Standalone script to validate notification manifests
 * 
 * Usage:
 *   npm run validate:notification-manifests        # Strict mode (fail on errors)
 *   npm run validate:notification-manifests:warn  # Warn-only mode (exit 0)
 * 
 * CI will always use strict mode
 */
async function runValidation() {
  logger.log('🔍 Validating notification manifests...');

  const isCI = process.env.CI === 'true';
  const warnOnly = process.env.VALIDATE_WARN_ONLY === 'true';

  const validator = new NotificationValidator();
  const result = await validator.performValidation();

  if (!result.isValid) {
    logger.error('❌ Manifest validation failed!');
    logger.error('Errors:', result.errors);

    if (result.warnings.length > 0) {
      logger.warn('Warnings:', result.warnings);
    }

    // Only exit with non-zero in CI or if warn-only is not set
    if (isCI && !warnOnly) {
      logger.error('Exiting with code 1 (CI strict mode)');
      process.exit(1);
    } else {
      logger.warn('⚠️ Exiting with code 0 (warn-only mode)');
      process.exit(0);
    }
  } else {
    logger.log('✅ All notification manifests validated successfully!');
    if (result.warnings.length > 0) {
      logger.warn('Warnings (non-blocking):', result.warnings);
    }
    process.exit(0);
  }
}

runValidation().catch((error) => {
  logger.error('Fatal error during validation:', error);
  process.exit(1);
});

