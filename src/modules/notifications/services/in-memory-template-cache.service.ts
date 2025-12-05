import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '@/shared/common/services/base.service';
import { CACHE_CONSTANTS } from '../constants/notification.constants';

/**
 * In-memory template cache service
 *
 * Caches both template source code and compiled templates in memory.
 * Templates are static files that don't change frequently, so in-memory
 * caching is sufficient and faster than Redis.
 *
 * Performance: Compiling Handlebars is fast (~1-5ms), so caching both
 * source and compiled templates in memory provides optimal performance.
 */
@Injectable()
export class InMemoryTemplateCacheService extends BaseService {
  private readonly logger: Logger = new Logger(
    InMemoryTemplateCacheService.name,
  );

  // In-memory cache for template source code
  private readonly sourceCache: Map<string, string> = new Map();

  // In-memory cache for compiled templates (per-instance)
  private readonly compiledCache: Map<string, HandlebarsTemplateDelegate> =
    new Map();
  private readonly MAX_COMPILED_CACHE_SIZE =
    CACHE_CONSTANTS.MAX_COMPILED_CACHE_SIZE;

  constructor() {
    super();
  }

  /**
   * Get template source from in-memory cache, or load and cache it
   * @param cacheKey - Unique cache key (e.g., "en:EMAIL:auth/otp-sent")
   * @param loadFn - Function to load template source if cache miss
   * @returns Template source code
   */
  async getTemplateSource(
    cacheKey: string,
    loadFn: () => Promise<string>,
  ): Promise<string> {
    // Check in-memory cache first
    if (this.sourceCache.has(cacheKey)) {
      return this.sourceCache.get(cacheKey)!;
    }

    // Cache miss - load and store
    const source = await loadFn();
    this.sourceCache.set(cacheKey, source);

    return source;
  }

  /**
   * Get compiled template with two-level caching:
   * 1. In-memory compiled cache (fastest)
   * 2. Compile from cached source (in-memory)
   *
   * @param cacheKey - Unique cache key
   * @param compileFn - Function to compile template (gets source from cache internally)
   * @returns Compiled Handlebars template
   */
  async getCompiledTemplate(
    cacheKey: string,
    compileFn: () => Promise<HandlebarsTemplateDelegate>,
  ): Promise<HandlebarsTemplateDelegate> {
    // Check in-memory compiled cache first (fastest)
    if (this.compiledCache.has(cacheKey)) {
      return this.compiledCache.get(cacheKey)!;
    }

    // Compile template (compileFn will get source from in-memory cache)
    const compiled = await compileFn();

    // Store in in-memory compiled cache (with size limit)
    if (this.compiledCache.size >= this.MAX_COMPILED_CACHE_SIZE) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.compiledCache.keys().next().value;
      this.compiledCache.delete(firstKey);
    }
    this.compiledCache.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Clear template cache for a specific template or all templates
   * @param templatePath - Optional template path to clear specific template
   */
  clearTemplateCache(templatePath?: string): void {
    try {
      if (templatePath) {
        // Clear cache entries matching pattern
        for (const key of this.sourceCache.keys()) {
          if (key.includes(templatePath)) {
            this.sourceCache.delete(key);
          }
        }
        for (const key of this.compiledCache.keys()) {
          if (key.includes(templatePath)) {
            this.compiledCache.delete(key);
          }
        }
      } else {
        // Clear all caches
        this.sourceCache.clear();
        this.compiledCache.clear();
      }
    } catch (error) {
      this.logger.error(
        `Failed to clear template cache - templatePath: ${templatePath}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
