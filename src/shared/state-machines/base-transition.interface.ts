/**
 * Base transition interface for all state machines
 * Provides common structure for state transitions across domains
 */
export interface BaseTransition<TStatus> {
  /** Current status */
  from: TStatus;

  /** Target status */
  to: TStatus;

  /** Business logic method name to execute */
  businessLogic: string;

  /** Human-readable description of the transition */
  description: string;

  /** Optional side effects that occur during this transition */
  sideEffects?: string[];
}
