import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseOrchestrator } from '@/shared/common/base/base-orchestrator';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserEvents } from '@/shared/events/user.events.enum';
import { UserCreatedEvent } from '../events/user.events';

/**
 * Orchestrator for UserCreatedEvent
 * 
 * Handles cross-domain side effects after a user is created:
 * - Grants default access (if needed)
 * - Sends welcome notifications (handled by notification module via event)
 * - Initializes user preferences (future enhancement)
 * 
 * This orchestrator demonstrates the pattern for cross-domain coordination.
 * Currently, most side effects are handled by domain event listeners,
 * but this provides a place for future cross-domain command emissions.
 */
@Injectable()
export class UserCreatedOrchestrator extends BaseOrchestrator {
  constructor(eventEmitter: TypeSafeEventEmitter) {
    super(eventEmitter);
  }

  @OnEvent(UserEvents.CREATED)
  async handle(event: UserCreatedEvent): Promise<void> {
    // Validate correlationId propagation
    if (event.correlationId) {
      // CorrelationId is already propagated from command to event
      // Future commands emitted here should use the same correlationId
    }

    // Future enhancements:
    // - Grant default permissions
    // - Initialize user preferences
    // - Set up default workspace
    // - Emit commands for cross-domain coordination
    
    // Example (when AccessControlCommands are available):
    // await this.eventEmitter.emitAsync(
    //   AccessControlCommands.GRANT_DEFAULT_ACCESS,
    //   new GrantDefaultAccessCommand(
    //     event.profile.id,
    //     event.actor,
    //     event.correlationId
    //   )
    // );
  }
}

