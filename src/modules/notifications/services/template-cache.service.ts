import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/shared/services/logger.service';
import * as Handlebars from 'handlebars';

/**
 * Service for caching compiled Handlebars templates and pre-rendered content
 */
@Injectable()
export class TemplateCacheService {
  private readonly compiledTemplateCache: Map<
    string,
    HandlebarsTemplateDelegate
  > = new Map();
  private readonly renderedContentCache: Map<
    string,
    { content: string; ttl: number }
  > = new Map();
  private readonly CACHE_TTL = 3600; // 1 hour for rendered content

  constructor(private readonly logger: LoggerService) {}

  /**
   * Get or compile template with caching
   * @param cacheKey - Cache key (can include channel prefix, e.g., "en:EMAIL:auth/otp-sent")
   * @param locale - Locale code (for logging)
   * @param compileFn - Function to compile template if cache miss
   */
  getCompiledTemplate(
    cacheKey: string,
    locale: string,
    compileFn: () => HandlebarsTemplateDelegate,
  ): HandlebarsTemplateDelegate {
    if (this.compiledTemplateCache.has(cacheKey)) {
      this.logger.debug(`Template cache hit: ${cacheKey}`);
      return this.compiledTemplateCache.get(cacheKey)!;
    }

    this.logger.debug(`Template cache miss, compiling: ${cacheKey}`);
    const compiled = compileFn();
    this.compiledTemplateCache.set(cacheKey, compiled);
    return compiled;
  }

  /**
   * Get or render template content with caching (for bulk notifications)
   */
  async getRenderedContent(
    templateName: string,
    locale: string,
    data: Record<string, any>,
    renderFn: () => Promise<string>,
  ): Promise<string> {
    // Create cache key based on template + locale + data hash
    const dataHash = this.hashData(data);
    const cacheKey = `${locale}:${templateName}:${dataHash}`;

    const cached = this.renderedContentCache.get(cacheKey);
    if (cached && cached.ttl > Date.now()) {
      this.logger.debug(`Rendered content cache hit: ${cacheKey}`);
      return cached.content;
    }

    this.logger.debug(`Rendered content cache miss, rendering: ${cacheKey}`);
    const content = await renderFn();
    this.renderedContentCache.set(cacheKey, {
      content,
      ttl: Date.now() + this.CACHE_TTL * 1000,
    });
    return content;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.compiledTemplateCache.clear();
    this.renderedContentCache.clear();
    this.logger.debug('Template cache cleared');
  }

  /**
   * Clear compiled template cache
   */
  clearCompiledCache(templateName?: string, locale?: string): void {
    if (templateName && locale) {
      const cacheKey = `${locale}:${templateName}`;
      this.compiledTemplateCache.delete(cacheKey);
      this.logger.debug(`Cleared compiled template cache: ${cacheKey}`);
    } else {
      this.compiledTemplateCache.clear();
      this.logger.debug('Cleared all compiled template cache');
    }
  }

  /**
   * Clear rendered content cache
   */
  clearRenderedCache(): void {
    this.renderedContentCache.clear();
    this.logger.debug('Cleared rendered content cache');
  }

  /**
   * Clean expired rendered content from cache
   */
  cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.renderedContentCache.entries()) {
      if (value.ttl <= now) {
        this.renderedContentCache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired rendered content entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    compiledTemplates: number;
    renderedContents: number;
    compiledMemory: number;
    renderedMemory: number;
  } {
    // Estimate memory usage (rough calculation)
    let compiledMemory = 0;
    for (const template of this.compiledTemplateCache.values()) {
      compiledMemory += 1024; // Rough estimate per template
    }

    let renderedMemory = 0;
    for (const entry of this.renderedContentCache.values()) {
      renderedMemory += entry.content.length * 2; // UTF-16 encoding
    }

    return {
      compiledTemplates: this.compiledTemplateCache.size,
      renderedContents: this.renderedContentCache.size,
      compiledMemory,
      renderedMemory,
    };
  }

  /**
   * Simple hash function for data to create cache key
   */
  private hashData(data: Record<string, any>): string {
    // Create a simple hash from stable data fields (exclude timestamps, IDs)
    const stableData = {
      template: data.template,
      eventName: data.eventName,
      type: data.type,
      // Include key fields that affect rendering
      name: data.name,
      link: data.link,
    };
    return JSON.stringify(stableData)
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(36);
  }
}
