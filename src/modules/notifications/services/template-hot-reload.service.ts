import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { watch, FSWatcher } from 'fs';
import { join } from 'path';
import { RedisTemplateCacheService } from './redis-template-cache.service';
import { LoggerService } from '@/shared/services/logger.service';
import { Config } from '@/shared/config/config';

/**
 * Service for hot reloading notification templates in development
 * Watches template files and clears cache when they change
 * Only active in development environment
 */
@Injectable()
export class TemplateHotReloadService implements OnModuleInit, OnModuleDestroy {
  private watcher?: FSWatcher;
  private readonly templateDir: string;

  constructor(
    private readonly redisCache: RedisTemplateCacheService,
    private readonly logger: LoggerService,
  ) {
    this.templateDir = join(process.cwd(), 'src/i18n/notifications');
  }

  /**
   * Initialize file watcher in development mode
   */
  onModuleInit(): void {
    if (Config.app.nodeEnv === 'development') {
      this.watchTemplates();
      this.logger.info(
        'Template hot reload enabled',
        'TemplateHotReloadService',
        { templateDir: this.templateDir },
      );
    }
  }

  /**
   * Watch template directory for changes
   * Uses Node's built-in fs.watch (recursive on supported platforms)
   */
  private watchTemplates(): void {
    try {
      this.watcher = watch(
        this.templateDir,
        { recursive: true },
        async (eventType, filename) => {
          if (eventType === 'change' && filename) {
            const filePath = join(this.templateDir, filename);
            await this.handleTemplateChange(filePath);
          }
        },
      );

      this.watcher.on('error', (error) => {
        if (error instanceof Error) {
          this.logger.error(
            'Template watcher error',
            error,
            'TemplateHotReloadService',
          );
        } else {
          this.logger.error(
            'Template watcher error',
            'TemplateHotReloadService',
            { error: String(error) },
          );
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          'Failed to initialize template watcher',
          error,
          'TemplateHotReloadService',
        );
      } else {
        this.logger.error(
          'Failed to initialize template watcher',
          'TemplateHotReloadService',
          { error: String(error) },
        );
      }
    }
  }

  /**
   * Handle template file change
   * Clears Redis cache for the changed template
   */
  private async handleTemplateChange(filePath: string): Promise<void> {
    try {
      // Extract template identifier from file path
      // Path format: src/i18n/notifications/{locale}/{channel}/{template}.{ext}
      const relativePath = filePath.replace(this.templateDir + '/', '');

      // Clear cache for this specific template
      await this.redisCache.clearTemplateCache(relativePath);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn(
          'Failed to reload template',
          'TemplateHotReloadService',
          {
            filePath,
            error: error.message,
          },
        );
      } else {
        this.logger.warn(
          'Failed to reload template',
          'TemplateHotReloadService',
          {
            filePath,
            error: String(error),
          },
        );
      }
    }
  }

  /**
   * Cleanup file watcher on module destroy
   */
  onModuleDestroy(): void {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
