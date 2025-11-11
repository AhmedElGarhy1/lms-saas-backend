import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '@/shared/common/services/base.service';
import { randomUUID } from 'crypto';

/**
 * Span context for tracing notification operations
 */
export interface NotificationSpan {
  /** Span name */
  name: string;
  /** Start time in milliseconds */
  startTime: number;
  /** Span attributes */
  attributes: Record<string, string | number | boolean>;
  /** Parent span (if nested) */
  parent?: NotificationSpan;
}

/**
 * Lightweight tracing service for notification operations
 * 
 * Uses correlation IDs and structured logging for tracing.
 * Can be upgraded to OpenTelemetry later without breaking changes.
 * 
 * Features:
 * - Span-based tracing with start/end
 * - Attribute tracking
 * - Correlation ID propagation
 * - Error recording
 * - Duration tracking
 */
@Injectable()
export class NotificationTracerService extends BaseService {
  private readonly logger: Logger;

  constructor() {
    super();
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  /**
   * Start a new span for tracing
   * @param name - Span name (e.g., 'notification.trigger', 'notification.render')
   * @param attributes - Optional attributes to attach to the span
   * @returns Span object for tracking
   */
  startSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>,
  ): NotificationSpan {
    const correlationId = this.getCorrelationId();
    const span: NotificationSpan = {
      name,
      startTime: Date.now(),
      attributes: {
        correlationId,
        ...attributes,
      },
    };

    return span;
  }

  /**
   * End a span and log the result
   * @param span - Span to end
   * @param success - Whether the operation succeeded
   * @param error - Optional error if operation failed
   * @param additionalAttributes - Optional additional attributes to add
   */
  endSpan(
    span: NotificationSpan,
    success: boolean = true,
    error?: Error,
    additionalAttributes?: Record<string, string | number | boolean>,
  ): void {
    const duration = Date.now() - span.startTime;
    const finalAttributes: Record<string, string | number | boolean> = {
      ...span.attributes,
      ...additionalAttributes,
      duration,
      success,
    };

    if (error) {
      finalAttributes.error = error.message;
      if (error.stack) {
        finalAttributes.errorStack = error.stack.substring(0, 500); // Limit stack trace length
      }
    }

    const logLevel = success ? 'debug' : 'error';
    const logContext: Record<string, string | number | boolean | Record<string, string | number | boolean>> = {
      span: span.name,
      correlationId: String(span.attributes.correlationId),
      duration,
      success,
      ...finalAttributes,
    };
    if (error) {
      logContext.error = error.message;
    }
    if (error instanceof Error && logLevel === 'error') {
      this.logger.error(
        `[TRACE] Span ended: ${span.name} (${duration}ms)`,
        error,
        logContext,
      );
    } else {
      this.logger[logLevel](
        `[TRACE] Span ended: ${span.name} (${duration}ms)`,
        logContext,
      );
    }
  }

  /**
   * Add attributes to an existing span
   * @param span - Span to add attributes to
   * @param attributes - Attributes to add
   */
  addAttributes(
    span: NotificationSpan,
    attributes: Record<string, string | number | boolean>,
  ): void {
    Object.assign(span.attributes, attributes);
  }

  /**
   * Record an event in the current span
   * @param span - Current span
   * @param eventName - Event name
   * @param attributes - Optional event attributes
   */
  recordEvent(
    span: NotificationSpan,
    eventName: string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    // Event tracking - no logging needed, use proper tracing system
  }

  /**
   * Execute a function within a span
   * Automatically starts span, executes function, and ends span
   * @param name - Span name
   * @param fn - Function to execute
   * @param attributes - Optional span attributes
   * @returns Result of the function
   */
  async trace<T>(
    name: string,
    fn: (span: NotificationSpan) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, true);
      return result;
    } catch (error) {
      this.endSpan(span, false, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute a synchronous function within a span
   * @param name - Span name
   * @param fn - Function to execute
   * @param attributes - Optional span attributes
   * @returns Result of the function
   */
  traceSync<T>(
    name: string,
    fn: (span: NotificationSpan) => T,
    attributes?: Record<string, string | number | boolean>,
  ): T {
    const span = this.startSpan(name, attributes);
    try {
      const result = fn(span);
      this.endSpan(span, true);
      return result;
    } catch (error) {
      this.endSpan(span, false, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get correlation ID - generate a new one for each span
   * No longer uses RequestContext to support background/queue contexts
   */
  private getCorrelationId(): string {
    // Generate a new correlationId for tracing
    // In the future, this could accept correlationId as a parameter
    return randomUUID();
  }
}

