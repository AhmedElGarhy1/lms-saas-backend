import { Injectable } from '@nestjs/common';

/**
 * Command Guard
 * 
 * Provides idempotency protection for commands by tracking
 * which commands are currently being processed.
 * 
 * Prevents duplicate command execution by maintaining a Set
 * of processing command IDs (e.g., correlationId).
 * 
 * Usage:
 * ```typescript
 * const locked = await this.commandGuard.lock(command.correlationId);
 * if (!locked) {
 *   throw new Error('Command already being processed');
 * }
 * try {
 *   // Process command
 * } finally {
 *   this.commandGuard.release(command.correlationId);
 * }
 * ```
 */
@Injectable()
export class CommandGuard {
  private readonly processing = new Set<string>();

  /**
   * Attempt to lock a command for processing.
   * 
   * @param id - Unique identifier for the command (typically correlationId)
   * @returns true if lock was acquired, false if already processing
   */
  async lock(id: string): Promise<boolean> {
    if (this.processing.has(id)) {
      return false;
    }
    this.processing.add(id);
    return true;
  }

  /**
   * Release a command lock.
   * 
   * @param id - Unique identifier for the command (typically correlationId)
   */
  release(id: string): void {
    this.processing.delete(id);
  }

  /**
   * Check if a command is currently being processed.
   * 
   * @param id - Unique identifier for the command (typically correlationId)
   * @returns true if command is being processed, false otherwise
   */
  isProcessing(id: string): boolean {
    return this.processing.has(id);
  }

  /**
   * Clear all processing locks (useful for testing or cleanup).
   */
  clear(): void {
    this.processing.clear();
  }
}

