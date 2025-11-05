import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  validateTemplatePaths,
  validateProfileScopedChannels,
} from '../config/config-validator';

/**
 * Service that validates notification configurations at module startup
 * Ensures template paths match NotificationEventsMap and logs any mismatches
 */
@Injectable()
export class NotificationConfigValidatorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationConfigValidatorService.name);
  private readonly failOnError: boolean;

  constructor(private readonly configService?: ConfigService) {
    // Fail on validation errors in production if configured
    this.failOnError =
      this.configService?.get<string>(
        'NOTIFICATION_CONFIG_STRICT_VALIDATION',
      ) === 'true';
  }

  onModuleInit() {
    this.validateConfigurations();
  }

  /**
   * Validate all notification configurations
   * Logs warnings for mismatches
   * Optionally fails startup if NOTIFICATION_CONFIG_STRICT_VALIDATION=true
   */
  private validateConfigurations(): void {
    this.logger.log('Validating notification template configurations...');

    // Validate template paths
    const pathResult = validateTemplatePaths();
    let hasErrors = !pathResult.isValid;

    if (!pathResult.isValid) {
      this.logger.warn(
        `Found ${pathResult.errors.length} template path mismatch(es):`,
      );

      for (const error of pathResult.errors) {
        this.logger.warn(
          `  - ${error.message}`,
          NotificationConfigValidatorService.name,
        );
      }
    }

    // Validate profile-scoped channels
    const profileResult = validateProfileScopedChannels();
    if (!profileResult.isValid) {
      hasErrors = true;
      this.logger.warn(
        `Found ${profileResult.errors.length} profile-scoped channel validation error(s):`,
      );

      for (const error of profileResult.errors) {
        this.logger.warn(
          `  - ${error.message}`,
          NotificationConfigValidatorService.name,
        );
      }
    }

    if (hasErrors) {
      this.logger.warn(
        'Template paths should match NotificationEventsMap. Please update your configuration files.',
      );

      if (this.failOnError) {
        throw new Error(
          'Notification configuration validation failed. Set NOTIFICATION_CONFIG_STRICT_VALIDATION=false to allow startup with warnings.',
        );
      }
    } else {
      this.logger.log('✓ All notification template configurations are valid');
    }
  }
}
