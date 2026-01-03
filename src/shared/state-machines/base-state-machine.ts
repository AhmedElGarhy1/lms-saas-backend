import { BaseTransition } from './base-transition.interface';

/**
 * Base state machine class providing common functionality for all domain state machines
 * Uses Template Method pattern to allow domain-specific customization
 */
export abstract class BaseStateMachine<TStatus, TTransition extends BaseTransition<TStatus>> {

  /**
   * Abstract method - each domain must provide its transition definitions
   */
  protected abstract getTransitions(): TTransition[];

  /**
   * Get a specific transition between two statuses
   */
  getTransition(from: TStatus, to: TStatus): TTransition | null {
    return this.getTransitions().find(
      (transition) => transition.from === from && transition.to === to,
    ) || null;
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(from: TStatus, to: TStatus): boolean {
    return this.getTransition(from, to) !== null;
  }

  /**
   * Get all valid transitions from a specific status
   */
  getValidTransitionsFrom(from: TStatus): TTransition[] {
    return this.getTransitions().filter((transition) => transition.from === from);
  }

  /**
   * Get all valid transitions to a specific status
   */
  getValidTransitionsTo(to: TStatus): TTransition[] {
    return this.getTransitions().filter((transition) => transition.to === to);
  }

  /**
   * Get all possible target statuses from a specific status
   */
  getValidStatusesFrom(from: TStatus): TStatus[] {
    return this.getValidTransitionsFrom(from).map((transition) => transition.to);
  }

  /**
   * Get transition matrix for documentation and introspection
   */
  getTransitionMatrix(): Record<string, TTransition[]> {
    const matrix: Record<string, TTransition[]> = {};

    // Get all unique statuses that appear in transitions
    const allStatuses = new Set<TStatus>();
    this.getTransitions().forEach((transition) => {
      allStatuses.add(transition.from);
      allStatuses.add(transition.to);
    });

    // Build matrix for each status
    Array.from(allStatuses).forEach((status) => {
      matrix[String(status)] = this.getValidTransitionsFrom(status);
    });

    return matrix;
  }

  /**
   * Get business logic method name for a transition
   */
  getBusinessLogic(from: TStatus, to: TStatus): string | null {
    const transition = this.getTransition(from, to);
    return transition ? transition.businessLogic : null;
  }

  /**
   * Template method for executing transitions with business logic
   * Calls domain-specific executeBusinessLogic method
   */
  async executeTransition(from: TStatus, to: TStatus, context: any): Promise<any> {
    const transition = this.getTransition(from, to);
    if (!transition) {
      throw new Error(`Invalid transition: ${String(from)} → ${String(to)}`);
    }

    return this.executeBusinessLogic(transition.businessLogic, context);
  }

  /**
   * Abstract method - domain-specific business logic execution
   * Each domain implements this to handle their specific business logic
   */
  protected abstract executeBusinessLogic(logic: string, context: any): Promise<any>;
}
