import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import * as Handlebars from 'handlebars';
import { NotificationChannel } from '../src/modules/notifications/enums/notification-channel.enum';
import {
  getTemplatePath,
  templateExists,
} from '../src/modules/notifications/utils/template-path.util';
import { NotificationRegistry } from '../src/modules/notifications/manifests/registry/notification-registry';
import { NotificationManifestResolver } from '../src/modules/notifications/manifests/registry/notification-manifest-resolver.service';
import { Locale } from '../src/shared/common/enums/locale.enum';
import { ChannelManifest } from '../src/modules/notifications/manifests/types/manifest.types';
import { extractI18nVariables } from '../src/modules/notifications/utils/notification-i18n.util';

interface ValidationError {
  type: string;
  audience: string;
  channel: string;
  locale: string;
  template: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  stats: {
    totalTemplates: number;
    validatedTemplates: number;
    missingTemplates: number;
    invalidTemplates: number;
  };
}

/**
 * Build-time template validation script
 *
 * Validates:
 * - All templates referenced in manifests exist
 * - Templates are valid (Handlebars compiles, JSON parses, etc.)
 * - Templates exist for all supported locales
 *
 * Usage:
 *   npm run validate:templates
 *
 * Exit codes:
 *   0 - All templates valid
 *   1 - Validation errors found
 */
async function validateTemplates(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let totalTemplates = 0;
  let validatedTemplates = 0;
  let missingTemplates = 0;
  let invalidTemplates = 0;

  const manifestResolver = new NotificationManifestResolver();

  // Iterate through all notification types
  for (const [type, manifest] of Object.entries(NotificationRegistry)) {
    if (!manifest || !manifest.audiences) {
      continue;
    }

    // Validate each audience
    for (const [audienceId, audienceConfig] of Object.entries(
      manifest.audiences,
    )) {
      if (!audienceConfig?.channels) {
        continue;
      }

      // Validate each channel
      for (const [channelKey, channelConfig] of Object.entries(
        audienceConfig.channels,
      )) {
        const channel = channelKey as NotificationChannel;
        const config = channelConfig as ChannelManifest;

        // Skip WhatsApp - templates are reference-only, not used for rendering
        // WhatsApp uses pre-approved template names from WhatsApp Business API
        if (channel === NotificationChannel.WHATSAPP) {
          // Validate WhatsApp template name is provided (stored in template field)
          if (!config?.template) {
            errors.push({
              type,
              audience: audienceId,
              channel,
              locale: 'N/A',
              template: 'N/A',
              message: `Missing template for ${type}:${audienceId}:${channel}. WhatsApp channel requires template field with template name.`,
            });
          }
          continue; // Skip template file validation for WhatsApp
        }

        // Special handling for IN_APP channel - validate notifications.json structure instead of file paths
        if (channel === NotificationChannel.IN_APP) {
          // Use notification type enum value directly (e.g., "OTP", "PASSWORD_RESET")
          const notificationKey = type; // type is already the enum value string

          // Validate for all supported locales
          for (const locale of Object.values(Locale)) {
            totalTemplates++;

            const notificationsJsonPath = join(
              process.cwd(),
              'src/i18n',
              locale,
              'notifications.json',
            );

            if (!existsSync(notificationsJsonPath)) {
              missingTemplates++;
              errors.push({
                type,
                audience: audienceId,
                channel,
                locale,
                template: 'notifications.json',
                message: `Missing notifications.json file for locale ${locale}`,
              });
              continue;
            }

            try {
              const notificationsJsonContent = await readFile(
                notificationsJsonPath,
                'utf-8',
              );
              const notificationsJson = JSON.parse(notificationsJsonContent);

              // Check if notification key exists (using enum value directly)
              if (!notificationsJson[notificationKey]) {
                invalidTemplates++;
                errors.push({
                  type,
                  audience: audienceId,
                  channel,
                  locale,
                  template: 'notifications.json',
                  message: `Missing notification key '${notificationKey}' in ${locale}/notifications.json`,
                });
                continue;
              }

              const notification = notificationsJson[notificationKey];

              // Validate structure
              if (
                !notification.title ||
                typeof notification.title !== 'string'
              ) {
                invalidTemplates++;
                errors.push({
                  type,
                  audience: audienceId,
                  channel,
                  locale,
                  template: 'notifications.json',
                  message: `Invalid or missing 'title' in ${notificationKey} for ${locale}`,
                });
                continue;
              }

              if (
                !notification.message ||
                typeof notification.message !== 'string'
              ) {
                invalidTemplates++;
                errors.push({
                  type,
                  audience: audienceId,
                  channel,
                  locale,
                  template: 'notifications.json',
                  message: `Invalid or missing 'message' in ${notificationKey} for ${locale}`,
                });
                continue;
              }

              // For IN_APP, we only validate that translations exist and have valid structure
              // Variable validation is done at runtime when event data is available
              // This is because IN_APP may use different variables than other channels
              // (e.g., {center.name} instead of {centerName})
              // The runtime validation in NotificationRenderer will catch missing variables

              validatedTemplates++;
            } catch (error) {
              invalidTemplates++;
              errors.push({
                type,
                audience: audienceId,
                channel,
                locale,
                template: 'notifications.json',
                message: `Failed to parse or validate notifications.json for ${locale}: ${error instanceof Error ? error.message : String(error)}`,
              });
            }
          }
          continue; // Skip file-based validation for IN_APP
        }

        if (!config?.template) {
          continue;
        }

        const templatePath = config.template;

        // Validate for all supported locales
        for (const locale of Object.values(Locale)) {
          totalTemplates++;

          // Check if template exists
          if (!templateExists(templatePath, locale, channel)) {
            const fullPath = getTemplatePath(templatePath, locale, channel);
            missingTemplates++;
            errors.push({
              type,
              audience: audienceId,
              channel,
              locale,
              template: templatePath,
              message: `Template file does not exist: ${fullPath}`,
            });
            continue;
          }

          // Validate template content
          try {
            const fullPath = getTemplatePath(templatePath, locale, channel);
            const content = await readFile(fullPath, 'utf-8');
            const ext = extname(fullPath);

            // Validate based on file extension
            if (ext === '.hbs') {
              // Validate Handlebars template compiles
              try {
                Handlebars.compile(content);
                validatedTemplates++;
              } catch (compileError) {
                invalidTemplates++;
                errors.push({
                  type,
                  audience: audienceId,
                  channel,
                  locale,
                  template: templatePath,
                  message: `Handlebars compilation error: ${compileError instanceof Error ? compileError.message : String(compileError)}`,
                });
              }
            } else if (ext === '.json') {
              // Validate JSON template parses
              try {
                JSON.parse(content);
                validatedTemplates++;
              } catch (parseError) {
                invalidTemplates++;
                errors.push({
                  type,
                  audience: audienceId,
                  channel,
                  locale,
                  template: templatePath,
                  message: `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                });
              }
            } else if (ext === '.txt') {
              // Text templates are always valid (just strings)
              validatedTemplates++;
            } else {
              warnings.push(
                `Unknown template extension: ${ext} for ${type}:${audienceId}:${channel}:${locale}`,
              );
              validatedTemplates++;
            }
          } catch (error) {
            invalidTemplates++;
            errors.push({
              type,
              audience: audienceId,
              channel,
              locale,
              template: templatePath,
              message: `Failed to read template: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalTemplates,
      validatedTemplates,
      missingTemplates,
      invalidTemplates,
    },
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Validating notification templates...\n');

  const result = await validateTemplates();

  // Print statistics
  console.log('📊 Validation Statistics:');
  console.log(`  Total templates: ${result.stats.totalTemplates}`);
  console.log(`  Validated: ${result.stats.validatedTemplates}`);
  console.log(`  Missing: ${result.stats.missingTemplates}`);
  console.log(`  Invalid: ${result.stats.invalidTemplates}`);
  console.log('');

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((warning) => console.log(`  - ${warning}`));
    console.log('');
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ Validation Errors:');
    result.errors.forEach((error) => {
      console.log(
        `  - ${error.type}:${error.audience}:${error.channel}:${error.locale}`,
      );
      console.log(`    Template: ${error.template}`);
      console.log(`    Error: ${error.message}`);
      console.log('');
    });
  }

  // Exit with appropriate code
  if (result.isValid) {
    console.log('✅ All templates validated successfully!');
    process.exit(0);
  } else {
    console.log(
      `❌ Template validation failed with ${result.errors.length} error(s)`,
    );
    process.exit(1);
  }
}

// Run validation
main().catch((error) => {
  console.error('Fatal error during template validation:', error);
  process.exit(1);
});
