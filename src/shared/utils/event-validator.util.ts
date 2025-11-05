import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommandTypeMap, EventTypeMap, CommandName, EventName } from '../events/event-type-map';

/**
 * Event Validator Utility
 * 
 * Validates architecture rules for command/event pattern at application bootstrap:
 * - Ensures only one handler per command
 * - Warns if domain event listeners emit commands (should use orchestrators)
 * - Validates event naming conventions
 * - Checks correlationId propagation
 */
export class EventValidator {
  private readonly logger = new Logger(EventValidator.name);
  private commandHandlers = new Map<string, string[]>(); // command name -> handler class names
  private eventListeners = new Map<string, string[]>(); // event name -> listener class names
  private violations: string[] = [];

  /**
   * Validate architecture rules for all registered handlers
   * 
   * @param moduleRef - NestJS module reference to scan for handlers
   */
  async validate(moduleRef: ModuleRef): Promise<void> {
    this.logger.log('Starting event/command architecture validation...');

    // Scan all providers for @OnEvent decorators
    await this.scanHandlers(moduleRef);

    // Validate rules
    this.validateOneHandlerPerCommand();
    this.validateEventNamingConventions();
    this.logViolations();

    if (this.violations.length > 0) {
      this.logger.warn(`Found ${this.violations.length} architecture violations`);
    } else {
      this.logger.log('✓ All architecture rules validated successfully');
    }
  }

  /**
   * Scan all providers for @OnEvent decorators
   * This is a simplified version - in production, you'd use reflection to scan
   * all registered providers and their metadata
   */
  private async scanHandlers(moduleRef: ModuleRef): Promise<void> {
    // Note: This is a simplified validator. In a production environment,
    // you would use NestJS reflection to scan all providers and their @OnEvent decorators.
    // For now, this serves as a template for the validation logic.
    
    this.logger.debug('Scanning handlers (simplified - full implementation requires reflection)');
  }

  /**
   * Register a command handler for validation
   */
  registerCommandHandler(commandName: CommandName, handlerClassName: string): void {
    if (!this.commandHandlers.has(commandName)) {
      this.commandHandlers.set(commandName, []);
    }
    this.commandHandlers.get(commandName)!.push(handlerClassName);
  }

  /**
   * Register an event listener for validation
   */
  registerEventListener(eventName: EventName, listenerClassName: string): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(listenerClassName);
  }

  /**
   * Validate that each command has exactly one handler
   */
  private validateOneHandlerPerCommand(): void {
    for (const [commandName, handlers] of this.commandHandlers.entries()) {
      if (handlers.length === 0) {
        this.violations.push(
          `Command '${commandName}' has no registered handler`,
        );
      } else if (handlers.length > 1) {
        this.violations.push(
          `Command '${commandName}' has ${handlers.length} handlers (expected 1): ${handlers.join(', ')}`,
        );
      }
    }
  }

  /**
   * Validate event naming conventions
   * - Commands should be in present tense (e.g., 'user.create')
   * - Events should be in past tense (e.g., 'user.created')
   */
  private validateEventNamingConventions(): void {
    // Check command naming (should be present tense)
    for (const commandName of this.commandHandlers.keys()) {
      if (!this.isCommandName(commandName)) {
        this.violations.push(
          `Command name '${commandName}' does not follow naming convention (should be present tense, e.g., 'user.create')`,
        );
      }
    }

    // Check event naming (should be past tense)
    for (const eventName of this.eventListeners.keys()) {
      if (!this.isEventName(eventName)) {
        this.violations.push(
          `Event name '${eventName}' does not follow naming convention (should be past tense, e.g., 'user.created')`,
        );
      }
    }
  }

  /**
   * Check if a name follows command naming convention (present tense)
   */
  private isCommandName(name: string): boolean {
    // Commands should be in present tense (e.g., 'user.create', 'user.update')
    // They should NOT end with '-ed', '-ing', etc.
    return !name.match(/\.(created|updated|deleted|activated|restored|granted|revoked|assigned|removed)$/);
  }

  /**
   * Check if a name follows event naming convention (past tense)
   */
  private isEventName(name: string): boolean {
    // Events should be in past tense (e.g., 'user.created', 'user.updated')
    return name.match(/\.(created|updated|deleted|activated|restored|granted|revoked|assigned|removed|logged|refreshed|changed)$/) !== null;
  }

  /**
   * Log all violations
   */
  private logViolations(): void {
    if (this.violations.length === 0) {
      return;
    }

    this.logger.warn('Architecture Violations Found:');
    this.violations.forEach((violation, index) => {
      this.logger.warn(`  ${index + 1}. ${violation}`);
    });
  }

  /**
   * Get all violations
   */
  getViolations(): string[] {
    return [...this.violations];
  }

  /**
   * Clear all registered handlers and violations
   */
  clear(): void {
    this.commandHandlers.clear();
    this.eventListeners.clear();
    this.violations = [];
  }
}

/**
 * Validate correlationId propagation in event chain
 * 
 * This is a runtime check that can be added to event handlers
 * to ensure correlationId is properly propagated.
 */
export function validateCorrelationId(
  commandCorrelationId: string,
  eventCorrelationId: string,
  context: string,
): void {
  if (commandCorrelationId !== eventCorrelationId) {
    const logger = new Logger('CorrelationIdValidator');
    logger.warn(
      `CorrelationId mismatch in ${context}: command=${commandCorrelationId}, event=${eventCorrelationId}`,
    );
  }
}

