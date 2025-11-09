/**
 * Fake Redis implementation with in-memory state
 * Used for testing to inspect cache state and assert caching behavior
 */
export class FakeRedis {
  private data: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

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
  ): Promise<string | null> {
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

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    await this.set(key, value, 'EX', seconds);
    return 'OK';
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


