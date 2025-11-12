/**
 * Builds consistent rate limit keys for Redis
 */
export class RateLimitKeyBuilder {
  /**
   * Build a rate limit key with prefix and context
   * @param prefix - Optional key prefix (e.g., from config)
   * @param context - Context identifier (http, websocket, notification)
   * @param identifier - Unique identifier (user ID, IP, etc.)
   * @returns Formatted Redis key
   */
  static buildKey(
    prefix: string | undefined,
    context: string | undefined,
    identifier: string,
  ): string {
    const parts: string[] = [];

    if (prefix) {
      parts.push(prefix);
    }

    parts.push('rate-limit');

    if (context) {
      parts.push(context);
    }

    // Normalize identifier (remove special characters that could break Redis keys)
    const normalizedIdentifier = identifier
      .replace(/[^a-zA-Z0-9:_-]/g, '_')
      .replace(/_{2,}/g, '_');

    parts.push(normalizedIdentifier);

    return parts.join(':');
  }

  /**
   * Build a key for a specific context
   * @param context - Context identifier
   * @param identifier - Unique identifier
   * @param prefix - Optional key prefix
   * @returns Formatted Redis key
   */
  static buildContextKey(
    context: string,
    identifier: string,
    prefix?: string,
  ): string {
    return this.buildKey(prefix, context, identifier);
  }
}
