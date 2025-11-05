import { Injectable } from '@nestjs/common';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

/**
 * Base class for all orchestrators.
 * 
 * Orchestrators handle cross-domain coordination by translating domain events
 * into follow-up commands. They are the ONLY place where commands should be
 * emitted in response to events.
 * 
 * Rules:
 * - Orchestrators listen to domain events (not commands)
 * - Orchestrators emit new commands (not events)
 * - Orchestrators preserve correlationId through the chain
 * - Orchestrators handle cross-domain side effects
 * 
 * Example:
 * ```typescript
 * @Injectable()
 * export class UserCreatedOrchestrator extends BaseOrchestrator {
 *   @OnEvent(UserEvents.CREATED)
 *   async handle(event: UserCreatedEvent) {
 *     await this.eventEmitter.emitAsync(
 *       AccessControlCommands.GRANT_DEFAULT_ACCESS,
 *       new GrantDefaultAccessCommand(event.profile.id, event.actor, event.correlationId)
 *     );
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseOrchestrator {
  constructor(protected readonly eventEmitter: TypeSafeEventEmitter) {}
}

