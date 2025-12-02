import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { watch, FSWatcher } from 'fs';
import { join } from 'path';
import { InMemoryTemplateCacheService } from './in-memory-template-cache.service';
import { BaseService } from '@/shared/common/services/base.service';
import { Config } from '@/shared/config/config';

/**
 * Service for hot reloading notification templates in development
 * Watches template files and clears cache when they change
 * Only active in development environment
 */
@Injectable()
export class TemplateHotReloadService
  extends BaseService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger = new Logger(TemplateHotReloadService.name);
  private watcher?: FSWatcher;
  private readonly templateDir: string;

  constructor(private readonly templateCache: InMemoryTemplateCacheService) {
    super();
    this.templateDir = join(process.cwd(), 'src/i18n/notifications');
  }

  /**
   * Initialize file watcher in development mode
   */
  onModuleInit(): void {
    if (Config.app.nodeEnv === 'development') {
      this.watchTemplates();
      this.logger.log(
        `Template hot reload enabled - templateDir: ${this.templateDir}`,
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
        this.logger.error('Template watcher error', error);
      });
    } catch (error) {
      this.logger.error('Failed to initialize template watcher', error);
    }
  }

  /**
   * Handle template file change
   * Clears in-memory cache for the changed template
   */
  private async handleTemplateChange(filePath: string): Promise<void> {
    try {
      // Extract template identifier from file path
      // Path format: src/i18n/notifications/{locale}/{channel}/{template}.{ext}
      const relativePath = filePath.replace(this.templateDir + '/', '');

      // Clear in-memory cache for this specific template
      await this.templateCache.clearTemplateCache(relativePath);
    } catch (error) {
      this.logger.warn('Failed to reload template', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
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
