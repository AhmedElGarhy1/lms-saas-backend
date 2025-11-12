import Redis from 'ioredis';

/**
 * Fake Redis implementation with in-memory state
 * Used for testing to inspect cache state and assert caching behavior
 * Implements the methods used by RedisService and notification services
 *
 * Note: This doesn't implement the full Redis interface (which has 300+ methods),
 * but implements all methods actually used in the codebase.
 */
export class FakeRedis {
  private data: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();
  private sortedSets?: Map<string, Map<number, number>>;

  async get(key: string): Promise<string | null> {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.del(key);
      return null;
    }
    return this.data.get(key) || null;
  }

  async set(
    key: string,
    value: string,
    ...args: (string | number)[]
  ): Promise<'OK' | null> {
    // Support ioredis SET signature: set(key, value, 'EX', seconds, 'NX')
    let ttlSeconds: number | undefined;
    let nx = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && typeof args[i + 1] === 'number') {
        ttlSeconds = args[i + 1] as number;
        i++; // Skip next arg
      } else if (args[i] === 'NX') {
        nx = true;
      }
    }

    // If NX flag is set and key exists, return null (not set)
    if (nx && this.data.has(key)) {
      return null;
    }

    // Set the key
    this.data.set(key, value);
    if (ttlSeconds) {
      this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    }

    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.data.has(key)) {
        count++;
      }
    }
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    await this.set(key, value, 'EX', seconds);
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = this.data.get(key);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown> {
    // Simple Lua script evaluation for common patterns
    // This is a simplified implementation for testing
    // For full Lua support, you'd need a proper Lua interpreter

    // Extract keys and arguments
    const keys = args.slice(0, numKeys) as string[];
    const scriptArgs = args.slice(numKeys);

    // Handle common script patterns used in the codebase
    if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZCARD')) {
      // Sliding window rate limit pattern
      const key = keys[0];
      const windowStart = parseInt(scriptArgs[0] as string, 10);
      const now = parseInt(scriptArgs[1] as string, 10);
      const limit = parseInt(scriptArgs[2] as string, 10);

      // Remove old entries (simplified - in real Redis this uses sorted sets)
      // For testing, we'll use a simplified approach
      const sortedSetKey = `sorted:${key}`;
      if (!this.sortedSets) {
        this.sortedSets = new Map<string, Map<number, number>>();
      }
      if (!this.sortedSets.has(sortedSetKey)) {
        this.sortedSets.set(sortedSetKey, new Map());
      }
      const sortedSet = this.sortedSets.get(sortedSetKey)!;

      // Remove entries before windowStart
      for (const [score] of sortedSet.entries()) {
        if (score < windowStart) {
          sortedSet.delete(score);
        }
      }

      const count = sortedSet.size;
      if (count < limit) {
        sortedSet.set(now, now);
        this.expirations.set(
          sortedSetKey,
          Date.now() + (scriptArgs[3] as number) * 1000,
        );
        return [1, count + 1];
      }
      return [0, count];
    }

    if (
      script.includes('ZREMRANGEBYSCORE') &&
      script.includes('ZCARD') &&
      !script.includes('ZADD')
    ) {
      // Circuit breaker pattern - just count
      const key = keys[0];
      const windowStart = parseInt(scriptArgs[0] as string, 10);
      const threshold = parseInt(scriptArgs[1] as string, 10);

      const sortedSetKey = `sorted:${key}`;
      if (!this.sortedSets) {
        this.sortedSets = new Map<string, Map<number, number>>();
      }
      if (!this.sortedSets.has(sortedSetKey)) {
        this.sortedSets.set(sortedSetKey, new Map());
      }
      const sortedSet = this.sortedSets.get(sortedSetKey)!;

      // Remove entries before windowStart
      for (const [score] of sortedSet.entries()) {
        if (score < windowStart) {
          sortedSet.delete(score);
        }
      }

      const count = sortedSet.size;
      const windowSeconds = parseInt(scriptArgs[2] as string, 10);
      this.expirations.set(
        sortedSetKey,
        Date.now() + (windowSeconds + 60) * 1000,
      );

      return count >= threshold ? 1 : 0;
    }

    // Default: return empty result
    return null;
  }

  async zadd(
    key: string,
    score: number,
    member: string | number,
  ): Promise<number> {
    const sortedSetKey = `sorted:${key}`;
    if (!this.sortedSets) {
      this.sortedSets = new Map<string, Map<number, number>>();
    }
    if (!this.sortedSets.has(sortedSetKey)) {
      this.sortedSets.set(sortedSetKey, new Map());
    }
    const sortedSet = this.sortedSets.get(sortedSetKey)!;
    const memberNum = typeof member === 'string' ? parseFloat(member) : member;
    sortedSet.set(score, memberNum);
    return 1;
  }

  async zremrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<number> {
    const sortedSetKey = `sorted:${key}`;
    if (!this.sortedSets || !this.sortedSets.has(sortedSetKey)) {
      return 0;
    }
    const sortedSet = this.sortedSets.get(sortedSetKey)!;
    const minNum =
      min === '-inf'
        ? -Infinity
        : typeof min === 'string'
          ? parseFloat(min)
          : min;
    const maxNum =
      max === '+inf'
        ? Infinity
        : typeof max === 'string'
          ? parseFloat(max)
          : max;

    let removed = 0;
    for (const [score] of sortedSet.entries()) {
      if (score >= minNum && score <= maxNum) {
        sortedSet.delete(score);
        removed++;
      }
    }
    return removed;
  }

  async zcard(key: string): Promise<number> {
    const sortedSetKey = `sorted:${key}`;
    if (!this.sortedSets || !this.sortedSets.has(sortedSetKey)) {
      return 0;
    }
    return this.sortedSets.get(sortedSetKey)!.size;
  }

  async zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<string[]> {
    const sortedSetKey = `sorted:${key}`;
    if (!this.sortedSets || !this.sortedSets.has(sortedSetKey)) {
      return [];
    }
    const sortedSet = this.sortedSets.get(sortedSetKey)!;
    const minNum =
      min === '-inf'
        ? -Infinity
        : typeof min === 'string'
          ? parseFloat(min)
          : min;
    const maxNum =
      max === '+inf'
        ? Infinity
        : typeof max === 'string'
          ? parseFloat(max)
          : max;

    const results: string[] = [];
    for (const [score, member] of sortedSet.entries()) {
      if (score >= minNum && score <= maxNum) {
        results.push(member.toString());
      }
    }
    return results.sort((a, b) => parseFloat(a) - parseFloat(b));
  }

  // Inspection methods for tests
  getValue(key: string): string | undefined {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.del(key);
      return undefined;
    }
    return this.data.get(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }

  hasKey(key: string): boolean {
    return this.data.has(key);
  }

  clear(): void {
    this.data.clear();
    this.expirations.clear();
    this.sortedSets?.clear();
  }
}

/**
 * Fake Redis Client that extends FakeRedis
 * Can be used as drop-in replacement for ioredis client
 */
export class FakeRedisClient extends FakeRedis {
  // Implements Redis client interface
  // Can be extended with additional methods if needed
}
