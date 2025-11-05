# Command/Event/Orchestrator Architecture Rules

## Overview

This document defines the architectural patterns and rules for the Command/Event/Orchestrator separation in the LMS Backend system. This architecture ensures type safety, clear separation of concerns, and maintainable code.

## Core Concepts

### Commands
**Definition:** Commands represent **intentions** (what we want to do) and are **input-oriented**.

- Commands are in **present tense** (e.g., `user.create`, `user.update`)
- Commands have **exactly one handler** per command
- Commands perform work and emit domain events
- Commands extend `BaseCommand` and include `correlationId`, `actor`, `timestamp`

**Example:**
```typescript
export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly dto: CreateUserDto,
    actor: ActorUser,
    public readonly targetProfileId?: string,
    public readonly targetProfileType?: ProfileType,
  ) {
    super(actor);
  }
}
```

### Events
**Definition:** Events represent **facts** (what happened) and are **result-oriented**.

- Events are in **past tense** (e.g., `user.created`, `user.updated`)
- Events can have **multiple listeners** (1-N)
- Events are immutable facts about what occurred
- Events extend `BaseEvent` and preserve `correlationId` from the command
- Events should not perform work, only notify

**Example:**
```typescript
export class UserCreatedEvent extends BaseEvent {
  constructor(
    public readonly user: User,
    public readonly profile: UserProfile,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}
```

### Orchestrators
**Definition:** Orchestrators handle **cross-domain coordination** by translating domain events into follow-up commands.

- Orchestrators listen to **domain events** (not commands)
- Orchestrators emit **new commands** (not events)
- Orchestrators preserve `correlationId` through the chain
- Orchestrators are the **ONLY** place where commands should be emitted in response to events
- Orchestrators extend `BaseOrchestrator`

**Example:**
```typescript
@Injectable()
export class UserCreatedOrchestrator extends BaseOrchestrator {
  @OnEvent(UserEvents.CREATED)
  async handle(event: UserCreatedEvent) {
    await this.eventEmitter.emitAsync(
      AccessControlCommands.GRANT_DEFAULT_ACCESS,
      new GrantDefaultAccessCommand(
        event.profile.id,
        event.actor,
        event.correlationId
      )
    );
  }
}
```

## Architecture Rules

### Rule 1: One Handler Per Command
- **Each command must have exactly one handler**
- Violation: Multiple handlers for the same command
- Handler location: `src/modules/{module}/listeners/command-handlers/{module}-command.handler.ts`

### Rule 2: Multiple Listeners Per Event
- **Each event can have multiple listeners**
- Listeners handle side effects (activity logging, notifications, etc.)
- Listener location: `src/modules/{module}/listeners/domain-events/{module}-activity.listener.ts`

### Rule 3: Commands Perform Work, Events Don't
- **Commands** perform the actual work (database operations, business logic)
- **Events** are emitted after work is complete
- **Events** should NOT perform work themselves

### Rule 4: Only Orchestrators Emit Commands from Events
- **Domain event listeners** should NOT emit commands
- **Orchestrators** are the ONLY place where commands can be emitted in response to events
- Violation: Event listener emitting a command directly

### Rule 5: CorrelationId Propagation
- **CorrelationId** must propagate from command → event → orchestrator → next command
- This enables tracing the full request chain
- All events must accept and use `correlationId` from their originating command

### Rule 6: Naming Conventions
- **Commands:** Present tense, lowercase with dots (e.g., `user.create`, `user.update`)
- **Events:** Past tense, lowercase with dots (e.g., `user.created`, `user.updated`)
- **Command classes:** PascalCase with "Command" suffix (e.g., `CreateUserCommand`)
- **Event classes:** PascalCase with "Event" suffix (e.g., `UserCreatedEvent`)

## Type Safety

### Type Maps
The system uses separate type maps for commands and events:

```typescript
// Command Type Map
export type CommandTypeMap = {
  'user.create': CreateUserCommand;
  'user.update': UpdateUserCommand;
  // ...
};

// Event Type Map
export type EventTypeMap = {
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  // ...
};
```

### TypeSafeEventEmitter
All emissions use `TypeSafeEventEmitter` which enforces:
- Compile-time type checking
- Correct payload types matching event/command names
- Prevents incorrect type usage

## File Structure

```
src/
├── shared/
│   ├── common/
│   │   ├── base/
│   │   │   ├── base-command.ts
│   │   │   ├── base-event.ts
│   │   │   └── base-orchestrator.ts
│   │   └── guards/
│   │       └── command.guard.ts (idempotency)
│   ├── commands/
│   │   └── {module}.commands.enum.ts
│   ├── events/
│   │   ├── event-type-map.ts
│   │   └── {module}.events.enum.ts
│   └── utils/
│       └── event-validator.util.ts
└── modules/
    └── {module}/
        ├── commands/
        │   └── {module}.commands.ts
        ├── events/
        │   └── {module}.events.ts
        ├── listeners/
        │   ├── command-handlers/
        │   │   └── {module}-command.handler.ts
        │   └── domain-events/
        │       └── {module}-activity.listener.ts
        └── orchestrators/
            └── {event-name}.orchestrator.ts
```

## Command Handler Pattern

```typescript
@Injectable()
export class UserCommandHandler {
  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: TypeSafeEventEmitter,
  ) {}

  @OnEvent(UserCommands.CREATE)
  async handleCreateUser(command: CreateUserCommand) {
    const { dto, actor, correlationId } = command;

    // Perform work
    const user = await this.userService.createUser(dto, actor);
    const profile = await this.userProfileService.createUserProfile(...);

    // Emit domain event with correlationId propagation
    await this.eventEmitter.emitAsync(
      UserEvents.CREATED,
      new UserCreatedEvent(user, profile, actor, correlationId),
    );

    return { user, profile };
  }
}
```

## Domain Event Listener Pattern

```typescript
@Injectable()
export class UserActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(UserEvents.CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    // Handle side effect (activity logging)
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      { targetUserId: event.user.id },
      event.actor!,
    );
    // Note: Do NOT emit commands here - use orchestrators
  }
}
```

## Orchestrator Pattern

```typescript
@Injectable()
export class UserCreatedOrchestrator extends BaseOrchestrator {
  constructor(eventEmitter: TypeSafeEventEmitter) {
    super(eventEmitter);
  }

  @OnEvent(UserEvents.CREATED)
  async handle(event: UserCreatedEvent) {
    // Cross-domain coordination - emit commands
    await this.eventEmitter.emitAsync(
      AccessControlCommands.GRANT_DEFAULT_ACCESS,
      new GrantDefaultAccessCommand(
        event.profile.id,
        event.actor,
        event.correlationId // Preserve correlationId
      )
    );
  }
}
```

## CorrelationId Flow

```
Request → Command (correlationId: abc-123)
         ↓
    Command Handler (uses correlationId: abc-123)
         ↓
    Domain Event (correlationId: abc-123) ← propagated
         ↓
    Event Listeners (receive correlationId: abc-123)
         ↓
    Orchestrator (receives correlationId: abc-123)
         ↓
    Next Command (correlationId: abc-123) ← preserved
```

## Validation

### Event Validator
The `EventValidator` utility validates architecture rules at bootstrap:
- Ensures one handler per command
- Warns if domain listeners emit commands
- Validates naming conventions
- Checks correlationId propagation

Run validation:
```typescript
const validator = new EventValidator();
await validator.validate(moduleRef);
```

## Common Patterns

### Pattern 1: Simple CRUD Operation
```typescript
// Command
UserCommands.UPDATE → UpdateUserCommand

// Handler
UserCommandHandler.handleUpdateUser() → performs work

// Event
UserEvents.UPDATED → UserUpdatedEvent

// Listeners
UserActivityListener.handleUserUpdated() → logs activity
```

### Pattern 2: Cross-Domain Coordination
```typescript
// Event
UserEvents.CREATED → UserCreatedEvent

// Orchestrator
UserCreatedOrchestrator.handle() → emits AccessControlCommands.GRANT_DEFAULT_ACCESS

// Command (from orchestrator)
AccessControlCommands.GRANT_DEFAULT_ACCESS → GrantDefaultAccessCommand

// Handler
AccessControlCommandHandler.handleGrantDefaultAccess() → performs work

// Event
AccessControlEvents.DEFAULT_ACCESS_GRANTED → DefaultAccessGrantedEvent
```

## Anti-Patterns (DO NOT DO)

### ❌ Event Listener Emitting Command
```typescript
// WRONG
@OnEvent(UserEvents.CREATED)
async handleUserCreated(event: UserCreatedEvent) {
  await this.eventEmitter.emitAsync(
    AccessControlCommands.GRANT_ACCESS, // ❌ Don't emit commands from listeners
    new GrantAccessCommand(...)
  );
}

// CORRECT - Use orchestrator
@Injectable()
export class UserCreatedOrchestrator extends BaseOrchestrator {
  @OnEvent(UserEvents.CREATED)
  async handle(event: UserCreatedEvent) {
    await this.eventEmitter.emitAsync(...); // ✅ OK in orchestrator
  }
}
```

### ❌ Multiple Handlers for Same Command
```typescript
// WRONG
@OnEvent(UserCommands.CREATE)
async handler1(command: CreateUserCommand) { ... }

@OnEvent(UserCommands.CREATE)
async handler2(command: CreateUserCommand) { ... } // ❌ Multiple handlers

// CORRECT - One handler, multiple listeners for events
@OnEvent(UserCommands.CREATE)
async handleCreateUser(command: CreateUserCommand) { ... } // ✅ Only one

@OnEvent(UserEvents.CREATED)
async listener1(event: UserCreatedEvent) { ... } // ✅ Multiple listeners OK

@OnEvent(UserEvents.CREATED)
async listener2(event: UserCreatedEvent) { ... } // ✅ Multiple listeners OK
```

### ❌ Event Performing Work
```typescript
// WRONG
@OnEvent(UserEvents.CREATED)
async handleUserCreated(event: UserCreatedEvent) {
  await this.userService.update(...); // ❌ Events shouldn't perform work
}

// CORRECT - Work in command handler, events just notify
@OnEvent(UserCommands.CREATE)
async handleCreateUser(command: CreateUserCommand) {
  await this.userService.create(...); // ✅ Work in command handler
  await this.eventEmitter.emitAsync(UserEvents.CREATED, ...);
}
```

## Migration Checklist

When migrating a module to command/event pattern:

- [ ] Create command enum in `src/shared/commands/{module}.commands.enum.ts`
- [ ] Create event enum in `src/shared/events/{module}.events.enum.ts`
- [ ] Create command classes extending `BaseCommand`
- [ ] Create event classes extending `BaseEvent` with `correlationId` support
- [ ] Create command handler with `@OnEvent` decorators
- [ ] Update domain event listeners to listen to events (not commands)
- [ ] Create orchestrators if cross-domain coordination needed
- [ ] Update type maps (`CommandTypeMap` and `EventTypeMap`)
- [ ] Update services to emit commands (not events)
- [ ] Register handlers, listeners, and orchestrators in module
- [ ] Test correlationId propagation
- [ ] Run event validator

## Success Criteria

✅ **One handler per command** - Exactly 1  
✅ **Multiple listeners per event** - 1-N allowed  
✅ **Orchestrator emission rule** - Only orchestrators emit commands from events  
✅ **Type errors** - 0 compile-time errors  
✅ **CorrelationId propagation** - 100% through chains  
✅ **Old pattern usage** - 0 (all migrated)  
✅ **Integration test coverage** - ≥90% for command→event→orchestrator chains

