import { Injectable, Scope, Inject, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { ActorUser } from '../types/actor-user.type';

/**
 * Enterprise-grade request context service
 * Provides comprehensive request tracking, correlation IDs, and contextual information
 * for distributed tracing, auditing, and debugging across microservices
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private readonly correlationId: string;
  private readonly requestId: string;
  private readonly startTime: number;
  private readonly startTimeISO: string;

  // User context
  private userId?: string;
  private userProfileId?: string;
  private userPhone?: string;
  private userName?: string;
  private profileType?: string;

  // Request context
  private requestMethod?: string;
  private requestUrl?: string;
  private requestIP?: string;
  private userAgent?: string;
  private centerId?: string;

  // Session context
  private sessionId?: string;

  // Additional metadata
  private tags: Record<string, any> = {};
  private customData: Record<string, any> = {};

  constructor(
    @Optional() @Inject('REQUEST') private readonly request?: Request,
  ) {
    this.correlationId = randomUUID();
    this.requestId = randomUUID();
    this.startTime = Date.now();
    this.startTimeISO = new Date(this.startTime).toISOString();

    // Initialize from request if available
    if (this.request) {
      this.initializeFromRequest(this.request);
    }
  }

  /**
   * Initialize context from HTTP request
   */
  private initializeFromRequest(request: Request): void {
    this.requestMethod = request.method;
    this.requestUrl = request.url;
    this.userAgent = request.get('User-Agent') || undefined;

    // Get client IP with proxy support
    this.requestIP = this.extractClientIP(request);

    // Get center ID from headers if present
    this.centerId = (request.headers['x-center-id'] as string) || undefined;

    // Get session ID from headers if present
    this.sessionId = (request.headers['x-session-id'] as string) || undefined;
  }

  /**
   * Extract client IP address with proxy support
   */
  private extractClientIP(request: Request): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      'unknown'
    );
  }

  /**
   * Get the correlation ID for this request
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Get the request ID for this request
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Set user context for this request
   */
  setUserContext(user: ActorUser): void {
    this.userId = user.id;
    this.userProfileId = user.userProfileId;
    this.userPhone = user.phone;
    this.userName = user.name;
    this.profileType = user.profileType;
    this.centerId = user.centerId;
  }

  /**
   * Set session context
   */
  setSessionContext(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Set center context
   */
  setCenterContext(centerId: string): void {
    this.centerId = centerId;
  }

  /**
   * Add custom tag for categorization
   */
  addTag(key: string, value: any): void {
    this.tags[key] = value;
  }

  /**
   * Add custom data for additional context
   */
  addCustomData(key: string, value: any): void {
    this.customData[key] = value;
  }

  /**
   * Get request metadata
   */
  getRequestMetadata(): Record<string, any> {
    return {
      method: this.requestMethod,
      url: this.requestUrl,
      ip: this.requestIP,
      userAgent: this.userAgent,
      centerId: this.centerId,
      sessionId: this.sessionId,
    };
  }

  /**
   * Get request duration in milliseconds
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get comprehensive request context for logging and tracing
   */
  getLoggingContext(): Record<string, any> {
    const context: Record<string, any> = {
      correlationId: this.correlationId,
      requestId: this.requestId,
      startTime: this.startTimeISO,
      duration: this.getDuration(),
      timestamp: new Date().toISOString(),
    };

    // User context
    if (this.userId) context.userId = this.userId;
    if (this.userProfileId) context.userProfileId = this.userProfileId;
    if (this.userPhone) context.userPhone = this.userPhone;
    if (this.userName) context.userName = this.userName;
    if (this.profileType) context.profileType = this.profileType;

    // Request context
    if (this.requestMethod) context.method = this.requestMethod;
    if (this.requestUrl) context.url = this.requestUrl;
    if (this.requestIP) context.ip = this.requestIP;
    if (this.userAgent) context.userAgent = this.userAgent;
    if (this.centerId) context.centerId = this.centerId;
    if (this.sessionId) context.sessionId = this.sessionId;

    // Custom data
    if (Object.keys(this.tags).length > 0) context.tags = this.tags;
    if (Object.keys(this.customData).length > 0)
      context.customData = this.customData;

    return context;
  }

  /**
   * Get minimal context for correlation and identification
   */
  getMinimalContext(): Record<string, any> {
    return {
      correlationId: this.correlationId,
      requestId: this.requestId,
      userId: this.userId,
      userProfileId: this.userProfileId,
      duration: this.getDuration(),
    };
  }

  /**
   * Get context for distributed tracing
   */
  getTracingContext(): Record<string, any> {
    return {
      correlationId: this.correlationId,
      requestId: this.requestId,
      userId: this.userId,
      centerId: this.centerId,
      sessionId: this.sessionId,
      startTime: this.startTimeISO,
      duration: this.getDuration(),
      ...this.tags,
    };
  }

  /**
   * Get logging context with additional user information
   */
  getLoggingContextWithUser(user?: ActorUser): Record<string, any> {
    const context = this.getLoggingContext();

    // Add user context if provided
    if (user) {
      context.userId = user.id;
      context.userProfileId = user.userProfileId;
      context.userPhone = user.phone;
      context.userName = user.name;
      context.profileType = user.profileType;
    }

    return context;
  }

  /**
   * Clone context for child operations (shallow copy)
   */
  clone(): RequestContextService {
    const cloned = new RequestContextService();
    // Copy immutable properties using Object.assign to bypass readonly restrictions
    Object.assign(cloned, {
      correlationId: this.correlationId,
      requestId: this.requestId,
      startTime: this.startTime,
      startTimeISO: this.startTimeISO,
    });

    // Copy mutable properties
    cloned.userId = this.userId;
    cloned.userProfileId = this.userProfileId;
    cloned.userPhone = this.userPhone;
    cloned.userName = this.userName;
    cloned.profileType = this.profileType;
    cloned.requestMethod = this.requestMethod;
    cloned.requestUrl = this.requestUrl;
    cloned.requestIP = this.requestIP;
    cloned.userAgent = this.userAgent;
    cloned.centerId = this.centerId;
    cloned.sessionId = this.sessionId;
    cloned.tags = { ...this.tags };
    cloned.customData = { ...this.customData };

    return cloned;
  }

  /**
   * Validate context integrity
   */
  validate(): boolean {
    // Basic validation
    return !!(this.correlationId && this.requestId && this.startTime);
  }

  /**
   * Get context as string for debugging
   */
  toString(): string {
    return JSON.stringify(this.getMinimalContext(), null, 2);
  }
}
