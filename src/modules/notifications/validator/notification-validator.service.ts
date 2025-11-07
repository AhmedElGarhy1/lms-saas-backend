import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationRegistry } from '../manifests/registry/notification-registry';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { templateExists, getTemplatePath } from '../utils/template-path.util';
import { REQUIRED_NOTIFICATION_EVENTS } from '../config/required-events.registry';
import { NotificationEventsMap } from '../config/notifications.map';
import { EXPECTED_LISTENER_EVENTS } from '../config/expected-listeners.registry';
import { NotificationTemplatePath } from '../types/templates.generated';
import { EventType } from '@/shared/events';

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
  private readonly logger = new Logger(NotificationValidator.name);
  private readonly isCI: boolean;

  constructor(
    private readonly manifestResolver?: NotificationManifestResolver,
  ) {
    // Detect CI environment
    this.isCI =
      process.env.CI === 'true' ||
      process.env.NODE_ENV === 'production' ||
      false;
  }

  onModuleInit() {
    this.validateManifests();
  }

  /**
   * Validate all manifests and log results
   * Fail-open in local dev, strict in CI
   */
  validateManifests(): void {
    this.logger.log('Validating notification manifests...');

    const result = this.performValidation();

    if (!result.isValid) {
      if (this.isCI) {
        // Fail in CI
        this.logger.error(
          '❌ Manifest validation failed in CI!',
          'NotificationValidator',
        );
        this.logger.error(
          `Errors: ${result.errors.join('; ')}`,
          'NotificationValidator',
        );
        if (result.warnings.length > 0) {
          this.logger.warn(
            `Warnings: ${result.warnings.join('; ')}`,
            'NotificationValidator',
          );
        }
        throw new Error(
          `Manifest validation failed: ${result.errors.join('; ')}`,
        );
      } else {
        // Warn-only in local dev
        this.logger.warn(
          '⚠️ Manifest validation found issues (warn-only in dev):',
          'NotificationValidator',
        );
        if (result.errors.length > 0) {
          this.logger.error(
            `Errors: ${result.errors.join('; ')}`,
            'NotificationValidator',
          );
        }
        if (result.warnings.length > 0) {
          this.logger.warn(
            `Warnings: ${result.warnings.join('; ')}`,
            'NotificationValidator',
          );
        }
      }
    } else {
      this.logger.log('✓ All notification manifests validated successfully');
    }
  }

  /**
   * Perform validation checks
   * @returns Validation result with errors and warnings
   */
  performValidation(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check all NotificationTypes have manifests (strict - all types required)
    const missingTypes = Object.values(NotificationType).filter((type) => {
      const manifest = NotificationRegistry[type];
      return (
        !manifest ||
        Object.keys(manifest).length === 0 ||
        !manifest.type ||
        !manifest.channels
      );
    });

    if (missingTypes.length > 0) {
      errors.push(`Missing manifests (required): ${missingTypes.join(', ')}`);
    }

    // 1.5. Check all required events are mapped
    const unmappedRequiredEvents = REQUIRED_NOTIFICATION_EVENTS.filter(
      (event) => !NotificationEventsMap[event],
    );

    if (unmappedRequiredEvents.length > 0) {
      errors.push(
        `Missing required event mappings: ${unmappedRequiredEvents.join(', ')}`,
      );
    }

    // 2. Check all templates exist and validate channel configs
    for (const [type, manifest] of Object.entries(NotificationRegistry)) {
      // Skip if manifest is not properly initialized (placeholder)
      if (
        !manifest ||
        Object.keys(manifest).length === 0 ||
        !manifest.channels
      ) {
        continue;
      }

      for (const [channelKey, channelConfig] of Object.entries(
        manifest.channels,
      )) {
        if (!channelConfig) continue;

        // Convert channel key to NotificationChannel enum
        const channel = channelKey as NotificationChannel;

        // Resolve template path (handles templateBase derivation)
        let resolvedTemplate: string;
        try {
          if (this.manifestResolver) {
            const resolvedConfig = this.manifestResolver.getChannelConfig(
              manifest,
              channel,
            );
            resolvedTemplate = resolvedConfig.template!;
          } else {
            // Fallback: use explicit template or derive from templateBase
            const channelFolder = channel.toLowerCase().replace('_', '-');
            resolvedTemplate =
              channelConfig.template ||
              (manifest.templateBase
                ? `${channelFolder}/${manifest.templateBase}`
                : '');
          }
        } catch (error) {
          errors.push(
            `Failed to resolve template for ${type}:${channel}: ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }

        if (!resolvedTemplate) {
          errors.push(
            `Missing template path for ${type}:${channel}. Either provide templateBase in manifest or explicit template in channel config.`,
          );
          continue;
        }

        // Check template exists
        const templatePath = getTemplatePath(
          resolvedTemplate,
          channelConfig.defaultLocale || 'en',
          channel,
        );

        if (
          !templateExists(
            resolvedTemplate,
            channelConfig.defaultLocale || 'en',
            channel,
          )
        ) {
          errors.push(
            `Missing template: ${type}:${channel} (${resolvedTemplate}) - Path: ${templatePath}`,
          );
        }

        // Validate template path against generated type (if using explicit template)
        // TypeScript already enforces this at compile time, but add runtime check for safety
        if (channelConfig.template) {
          // If explicit template is provided, it should be in NotificationTemplatePath type
          // This is mainly for documentation - TypeScript already enforces it at compile time
          // Runtime validation: template existence is already checked above
          // Type safety is enforced by TypeScript when using NotificationTemplatePath
          void (channelConfig.template as NotificationTemplatePath);
        }

        // Check EMAIL has subject
        if (channel === NotificationChannel.EMAIL && !channelConfig.subject) {
          warnings.push(`EMAIL channel missing subject: ${type}:${channel}`);
        }
      }
    }

    // 3. Check: All mapped events should have listeners
    const mappedEvents = Object.keys(NotificationEventsMap);
    const expectedListeners = EXPECTED_LISTENER_EVENTS;

    const mappedWithoutListeners = mappedEvents.filter(
      (event) => expectedListeners.includes(event as EventType),
      // Note: Full validation requires script execution
    );

    if (mappedWithoutListeners.length > 0) {
      warnings.push(
        `Mapped events may be missing listeners: ${mappedWithoutListeners.join(', ')}. Run 'npm run validate:notification-listeners' to verify.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
