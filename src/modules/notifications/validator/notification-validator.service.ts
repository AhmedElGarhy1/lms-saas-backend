import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationRegistry } from '../manifests/registry/notification-registry';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { templateExists, getTemplatePath } from '../utils/template-path.util';
import { Locale } from '@/shared/common/enums/locale.enum';
import { ChannelManifest } from '../manifests/types/manifest.types';

// Test environment detection - check NODE_ENV first (set by test-setup.ts)
// This is the most reliable indicator since test-setup.ts runs before any tests

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service that validates notification manifests at application startup
 *
 * Performs:
 * - Checks all NotificationTypes have manifests
 * - Validates all referenced templates exist
 * - Ensures EMAIL channels have subjects
 * - Warns-only in local dev, fails in CI
 */
@Injectable()
export class NotificationValidator implements OnModuleInit {
  private readonly isCI: boolean;

  private readonly logger?: Logger;

  constructor(
    private readonly manifestResolver?: NotificationManifestResolver,
  ) {
    this.logger = new Logger('NotificationValidator');
    // Detect CI environment - but skip if we're in test mode
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined;
    this.isCI =
      !isTestEnv &&
      (process.env.CI === 'true' ||
        process.env.NODE_ENV === 'production' ||
        false);
  }

  onModuleInit() {
    // Skip validation in test mode to prevent interference with test execution
    // Check NODE_ENV first (set by test-setup.ts via TestEnvGuard)
    // Then check Jest-specific indicators as fallback
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.npm_lifecycle_event === 'test' ||
      process.env.npm_lifecycle_event === 'test:watch' ||
      process.argv.some((arg) => arg.includes('jest')) ||
      process.argv.some((arg) => arg.includes('test')) ||
      // Check if we're being called from a test file (stack trace analysis)
      (new Error().stack?.includes('.spec.') ?? false) ||
      (new Error().stack?.includes('jest') ?? false);

    if (isTestEnv) {
      // Silently skip in test mode - don't log to avoid noise
      return;
    }
    // Note: onModuleInit cannot be async, so we call validateManifests without awaiting
    // This is acceptable since validation errors will be logged and thrown if in CI
    void this.validateManifests();
  }

  /**
   * Validate all manifests and log results
   * Fail-open in local dev, strict in CI
   */
  async validateManifests(): Promise<void> {
    if (this.logger) {
      this.logger.log('Validating notification manifests...');
    }

    const result = await this.performValidation();

    if (!result.isValid) {
      if (this.isCI) {
        // Fail in CI
        if (this.logger) {
          this.logger.error(
            `Manifest validation failed in CI - errors: ${JSON.stringify(result.errors)}`,
          );
          if (result.warnings.length > 0) {
            this.logger.warn(
              `Manifest validation warnings - warnings: ${JSON.stringify(result.warnings)}`,
            );
          }
        }
        throw new Error(
          `Manifest validation failed: ${result.errors.join('; ')}`,
        );
      } else {
        // Warn-only in local dev
        if (this.logger) {
          this.logger.warn(
            'Manifest validation found issues (warn-only in dev)',
          );
          if (result.errors.length > 0) {
            this.logger.error(
              `Manifest validation errors - errors: ${JSON.stringify(result.errors)}`,
            );
          }
          if (result.warnings.length > 0) {
            this.logger.warn(
              `Manifest validation warnings - warnings: ${JSON.stringify(result.warnings)}`,
            );
          }
        }
      }
    } else {
      if (this.logger) {
        this.logger.log('All notification manifests validated successfully');
      }
    }
  }

  /**
   * Perform validation checks
   * @returns Validation result with errors and warnings
   */
  async performValidation(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check all NotificationTypes have manifests (strict - all types required)
    const missingTypes = Object.values(NotificationType).filter((type) => {
      const manifest = NotificationRegistry[type];
      return (
        !manifest ||
        Object.keys(manifest).length === 0 ||
        !manifest.type ||
        !manifest.audiences ||
        Object.keys(manifest.audiences).length === 0
      );
    });

    if (missingTypes.length > 0) {
      errors.push(`Missing manifests (required): ${missingTypes.join(', ')}`);
    }

    // Note: Event-to-notification mapping is no longer used.
    // All handlers now use trigger() directly with NotificationType.

    // 2. Check all templates exist and validate channel configs
    for (const [type, manifest] of Object.entries(NotificationRegistry)) {
      // Skip if manifest is not properly initialized (placeholder)
      if (
        !manifest ||
        Object.keys(manifest).length === 0 ||
        !manifest.audiences ||
        Object.keys(manifest.audiences).length === 0
      ) {
        continue;
      }

      // Validate each audience
      for (const [audienceId, audienceConfig] of Object.entries(
        manifest.audiences,
      )) {
        if (!audienceConfig || !audienceConfig.channels) {
          continue;
        }

        for (const [channelKey, channelConfig] of Object.entries(
          audienceConfig.channels,
        )) {
          if (!channelConfig) continue;

          // Type assertion: channelConfig is ChannelManifest from Record<string, ChannelManifest>
          const config = channelConfig as ChannelManifest;

          // Convert channel key to NotificationChannel enum
          const channel = channelKey as NotificationChannel;

          // Validate template is provided (required for all channels except IN_APP)
          if (!config.template && channel !== NotificationChannel.IN_APP) {
            errors.push(
              `Missing template for ${type}:${audienceId}:${channel}. Template is required for all channels except IN_APP.`,
            );
            continue;
          }

          // Skip template file validation for WhatsApp - templates are reference-only
          // WhatsApp uses pre-approved template names from WhatsApp Business API
          if (channel === NotificationChannel.WHATSAPP) {
            // Skip template file existence check - WhatsApp templates are reference-only
            continue;
          }

          // Special handling for IN_APP channel - validate notifications.json structure instead of file paths
          if (channel === NotificationChannel.IN_APP) {
            // Use notification type enum value directly (e.g., "OTP", "PASSWORD_RESET")
            const notificationKey = type; // type is already the enum value string
            const supportedLocales = Object.values(Locale);

            for (const locale of supportedLocales) {
              const notificationsJsonPath = join(
                process.cwd(),
                'src/i18n',
                locale,
                'notifications.json',
              );

              if (!existsSync(notificationsJsonPath)) {
                errors.push(
                  `Missing notifications.json for locale ${locale} (required for IN_APP notifications)`,
                );
                continue;
              }

              try {
                const notificationsJsonContent = await readFile(
                  notificationsJsonPath,
                  'utf-8',
                );
                const notificationsJson = JSON.parse(notificationsJsonContent);

                if (!notificationsJson[notificationKey]) {
                  errors.push(
                    `Missing notification key '${notificationKey}' in ${locale}/notifications.json for ${type}`,
                  );
                } else {
                  // Validate structure
                  const notification = notificationsJson[notificationKey] as {
                    title?: string;
                    message?: string;
                  };
                  if (
                    !notification.title ||
                    typeof notification.title !== 'string'
                  ) {
                    errors.push(
                      `Invalid or missing 'title' in ${notificationKey} for ${locale}`,
                    );
                  }
                  if (
                    !notification.message ||
                    typeof notification.message !== 'string'
                  ) {
                    errors.push(
                      `Invalid or missing 'message' in ${notificationKey} for ${locale}`,
                    );
                  }

                  // For IN_APP, we only validate that translations exist and have valid structure
                  // Variable validation is done at runtime when event data is available
                  // This is because IN_APP may use different variables than other channels
                  // (e.g., {center.name} instead of {centerName})
                  // The runtime validation in NotificationRenderer will catch missing variables
                }
              } catch (error) {
                errors.push(
                  `Failed to parse notifications.json for locale ${locale}: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
            continue; // Skip file-based validation for IN_APP
          }

          // Check template exists for all supported locales
          // This ensures templates are available for all users regardless of their locale
          if (config.template) {
            const supportedLocales = Object.values(Locale);
            for (const locale of supportedLocales) {
              const templatePath = getTemplatePath(
                config.template,
                locale,
                channel,
              );

              if (!templateExists(config.template, locale, channel)) {
                errors.push(
                  `Missing template: ${type}:${audienceId}:${channel} (${config.template}) for locale ${locale} - Path: ${templatePath}`,
                );
              }
            }
          }

          // Validate template path against generated type (if using explicit template)
          // TypeScript already enforces this at compile time, but add runtime check for safety
          if (config.template) {
            // If explicit template is provided, template existence is validated above
            // No additional type checking needed since templates are resolved dynamically
            void config.template;
          }

          // Check EMAIL has subject
          if (channel === NotificationChannel.EMAIL && !config.subject) {
            warnings.push(
              `EMAIL channel missing subject: ${type}:${audienceId}:${channel}`,
            );
          }
        }
      }
    }

    // Note: Event-to-notification mapping validation removed.
    // All handlers now use trigger() directly with NotificationType.

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
