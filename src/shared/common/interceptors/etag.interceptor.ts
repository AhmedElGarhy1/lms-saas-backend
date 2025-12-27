import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { NO_ETAG_KEY } from '../decorators/no-etag.decorator';
import { RequestContext } from '../context/request.context';

/**
 * ETag Interceptor for Browser Caching
 *
 * This interceptor implements HTTP ETag support for efficient browser caching:
 * - Generates ETags from response body content and centerId (SHA-256 hash)
 * - Handles If-None-Match requests (returns 304 Not Modified when ETag matches)
 * - Sets ETag header on all GET responses (unless disabled via @NoETag decorator)
 * - ETags are scoped per center (via x-center-id header) to ensure cache isolation
 *
 * Benefits:
 * - Reduces bandwidth usage
 * - Improves client-side performance
 * - Enables conditional requests
 *
 * How it works:
 * 1. Client sends GET request with If-None-Match header containing previous ETag
 * 2. Server generates ETag from response body
 * 3. If ETags match, server returns 304 Not Modified (no body)
 * 4. If ETags don't match, server returns 200 OK with ETag header
 * 5. Client caches response using ETag for future requests
 *
 * @example
 * ```typescript
 * // Enable ETag (default for GET requests)
 * @Get('users')
 * getUsers() {
 *   return this.service.findAll();
 * }
 *
 * // Disable ETag for specific route
 * @Get('sensitive-data')
 * @NoETag()
 * getSensitiveData() {
 *   return this.service.getData();
 * }
 * ```
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only apply ETag processing to API routes
    if (!request.url.startsWith('/api')) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    // Skip ETag for non-GET requests (ETags are typically used for caching GET responses)
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if ETag is disabled for this route
    const noETag = this.reflector.getAllAndOverride<boolean>(NO_ETAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (noETag) {
      return next.handle();
    }

    // Check If-None-Match header from client
    const clientETag = request.headers['if-none-match'];

    // Handle the response - we need to process it to generate ETag
    return next.handle().pipe(
      map((data: unknown) => {
        // Check if response has already been sent (e.g., by exception filter)
        if (response.headersSent || response.finished) {
          return data;
        }

        // Generate ETag from response body and centerId (if available)
        const etag = this.generateETag(data);

        // Set ETag header on response
        response.setHeader('ETag', etag);

        // If client sent If-None-Match and it matches, return 304 Not Modified
        if (clientETag && this.compareETags(clientETag, etag)) {
          // Throw HttpException with 304 status - NestJS will handle this correctly
          // Pass empty object instead of null - exception filter will handle 304 specially
          throw new HttpException({}, HttpStatus.NOT_MODIFIED);
        }

        // ETags don't match or no client ETag - return data normally
        return data;
      }),
    );
  }

  /**
   * Generate ETag from response data and center context
   * Uses SHA-256 hash of JSON stringified response body + centerId (if available)
   * This ensures ETags are scoped per center, preventing cache collisions
   * when different centers return identical response bodies
   *
   * @param data - Response data
   * @returns ETag string (format: W/"<hash>")
   */
  private generateETag(data: unknown): string {
    try {
      const context = RequestContext.get();

      // Convert data to string for hashing
      // JSON.stringify provides deterministic output for ETag generation
      const dataString = JSON.stringify(data);

      // Include centerId in hash to scope ETags per center (if available)
      // This ensures different centers get different ETags even if response bodies are identical
      const hashInput = context.centerId
        ? `${context.centerId}:${dataString}`
        : dataString;

      // Generate hash
      const hash = createHash('sha256').update(hashInput).digest('hex');

      // Return ETag in format: W/"<hash>" (weak ETag, as recommended by HTTP spec)
      // Weak ETags allow for semantically equivalent content to share the same ETag
      // Using first 16 chars keeps ETags shorter while maintaining uniqueness
      return `W/"${hash.substring(0, 16)}"`;
    } catch {
      // If serialization fails, use timestamp-based ETag as fallback
      // This shouldn't happen in normal operation, but provides safety
      const timestamp = Date.now().toString();
      const hash = createHash('sha256').update(timestamp).digest('hex');
      return `W/"${hash.substring(0, 16)}"`;
    }
  }

  /**
   * Compare client ETag with server ETag
   * Handles weak ETags (W/ prefix) and strong ETags
   *
   * @param clientETag - ETag from If-None-Match header (may include W/ prefix and quotes)
   * @param serverETag - ETag generated from response
   * @returns true if ETags match
   */
  private compareETags(clientETag: string, serverETag: string): boolean {
    // Remove quotes and W/ prefix for comparison
    // ETags can come in formats: "hash", W/"hash", or hash
    const normalizeETag = (etag: string): string => {
      return etag
        .trim()
        .replace(/^W\//i, '') // Remove weak ETag prefix (case-insensitive)
        .replace(/^"/, '') // Remove leading quote
        .replace(/"$/, ''); // Remove trailing quote
    };

    const normalizedClient = normalizeETag(clientETag);
    const normalizedServer = normalizeETag(serverETag);

    return normalizedClient === normalizedServer;
  }
}
