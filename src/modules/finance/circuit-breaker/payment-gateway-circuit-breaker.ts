import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window to count failures (ms)
  successThreshold: number; // Successes needed in HALF_OPEN to close
}

interface ServiceConfig {
  [serviceName: string]: CircuitBreakerConfig;
}

@Injectable()
export class PaymentGatewayCircuitBreaker {
  private readonly logger = new Logger(PaymentGatewayCircuitBreaker.name);

  // Prometheus metrics
  @InjectMetric('finance_circuit_breaker_state')
  private readonly circuitBreakerState: Gauge<string>;

  @InjectMetric('finance_circuit_breaker_failures_total')
  private readonly failuresCounter: Counter<string>;

  @InjectMetric('finance_circuit_breaker_state_transitions_total')
  private readonly stateTransitionsCounter: Counter<string>;

  // Per-service circuit breaker states
  private serviceStates: Map<
    string,
    {
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      successesInHalfOpen: number;
    }
  > = new Map();

  // Service-specific configurations
  private readonly serviceConfigs: ServiceConfig = {
    paymob: {
      failureThreshold: 3, // Open after 3 failures (critical payment gateway)
      recoveryTimeout: 120000, // Wait 2 minutes before retry (give Paymob time to recover)
      monitoringPeriod: 300000, // Monitor over 5 minutes
      successThreshold: 2, // Need 2 successes to close (be conservative)
    },
    stripe: {
      failureThreshold: 5, // More tolerant for established gateways
      recoveryTimeout: 60000, // 1 minute recovery
      monitoringPeriod: 300000,
      successThreshold: 3,
    },
    mpesa: {
      failureThreshold: 3, // Critical for African markets
      recoveryTimeout: 180000, // 3 minutes (network issues common)
      monitoringPeriod: 600000, // Monitor over 10 minutes
      successThreshold: 2,
    },
    default: {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 300000,
      successThreshold: 3,
    },
  };

  /**
   * Get or create service state
   */
  private getServiceState(serviceName: string) {
    if (!this.serviceStates.has(serviceName)) {
      this.serviceStates.set(serviceName, {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        successesInHalfOpen: 0,
      });
    }
    return this.serviceStates.get(serviceName)!;
  }

  /**
   * Update service state
   */
  private updateServiceState(
    serviceName: string,
    updates: Partial<{
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      successesInHalfOpen: number;
    }>,
  ) {
    const currentState = this.getServiceState(serviceName);
    this.serviceStates.set(serviceName, { ...currentState, ...updates });
  }

  /**
   * Get configuration for a service
   */
  private getServiceConfig(serviceName: string): CircuitBreakerConfig {
    return this.serviceConfigs[serviceName] || this.serviceConfigs.default;
  }

  /**
   * Convert circuit state to numeric value for metrics
   */
  private getStateValue(state: CircuitState): number {
    switch (state) {
      case CircuitState.CLOSED:
        return 0;
      case CircuitState.OPEN:
        return 1;
      case CircuitState.HALF_OPEN:
        return 2;
      default:
        return -1;
    }
  }

  /**
   * Check if the service is currently in OPEN state (failing)
   */
  isOpen(serviceName: string): boolean {
    const serviceState = this.getServiceState(serviceName);
    return serviceState.state === CircuitState.OPEN;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    serviceName: string,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const serviceState = this.getServiceState(serviceName);

    // Update current state metric
    this.circuitBreakerState.set(
      { service: serviceName },
      this.getStateValue(serviceState.state),
    );

    if (serviceState.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(serviceName)) {
        this.updateServiceState(serviceName, {
          state: CircuitState.HALF_OPEN,
          successesInHalfOpen: 0,
        });
        this.logger.log(
          `Circuit breaker for ${serviceName} entering HALF_OPEN state`,
        );
      } else {
        this.failuresCounter.inc({
          service: serviceName,
          reason: 'circuit_open',
          state: 'open',
        });

        if (fallback) {
          this.logger.warn(
            `Circuit breaker OPEN for ${serviceName}, using fallback`,
          );
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordFailure(serviceName, error);
      if (fallback) {
        this.logger.warn(
          `Circuit breaker failure for ${serviceName}, using fallback`,
        );
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(serviceName: string): void {
    const serviceState = this.getServiceState(serviceName);
    const config = this.getServiceConfig(serviceName);

    if (serviceState.state === CircuitState.HALF_OPEN) {
      this.updateServiceState(serviceName, {
        successesInHalfOpen: serviceState.successesInHalfOpen + 1,
      });

      if (serviceState.successesInHalfOpen + 1 >= config.successThreshold) {
        this.transitionToState(
          serviceName,
          CircuitState.CLOSED,
          'success_threshold',
        );
        this.logger.log(
          `Circuit breaker for ${serviceName} CLOSED after successful recoveries`,
        );
      }
    } else if (serviceState.state === CircuitState.CLOSED) {
      // Reset failure count on success in normal operation
      this.updateServiceState(serviceName, { failures: 0 });
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(serviceName: string, error: any): void {
    const serviceState = this.getServiceState(serviceName);
    const config = this.getServiceConfig(serviceName);

    this.updateServiceState(serviceName, {
      failures: serviceState.failures + 1,
      lastFailureTime: Date.now(),
    });

    this.failuresCounter.inc({
      service: serviceName,
      error_type: error.constructor.name,
      state: serviceState.state,
    });

    if (serviceState.state === CircuitState.HALF_OPEN) {
      // If still failing in HALF_OPEN, go back to OPEN
      this.transitionToState(
        serviceName,
        CircuitState.OPEN,
        'half_open_failure',
      );
      this.logger.warn(
        `Circuit breaker for ${serviceName} returned to OPEN state after failure in HALF_OPEN`,
      );
    } else if (serviceState.failures + 1 >= config.failureThreshold) {
      this.transitionToState(
        serviceName,
        CircuitState.OPEN,
        'failure_threshold',
      );
      this.logger.error(
        `Circuit breaker for ${serviceName} OPENED after ${serviceState.failures + 1} failures`,
      );
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(serviceName: string): boolean {
    const serviceState = this.getServiceState(serviceName);
    const config = this.getServiceConfig(serviceName);
    return Date.now() - serviceState.lastFailureTime > config.recoveryTimeout;
  }

  /**
   * Transition service to a new state
   */
  private transitionToState(
    serviceName: string,
    newState: CircuitState,
    reason: string,
  ): void {
    const oldState = this.getServiceState(serviceName).state;
    this.updateServiceState(serviceName, {
      state: newState,
      failures: newState === CircuitState.CLOSED ? 0 : undefined,
      successesInHalfOpen: newState === CircuitState.HALF_OPEN ? 0 : undefined,
    });

    this.stateTransitionsCounter.inc({
      service: serviceName,
      from_state: oldState,
      to_state: newState,
      reason,
    });
  }

  /**
   * Reset circuit breaker to CLOSED state (legacy method for backward compatibility)
   */
  private reset(): void {
    // This method is kept for backward compatibility but should not be used
    this.logger.warn(
      'Using deprecated reset() method. Use transitionToState() instead.',
    );
  }

  /**
   * Get current circuit breaker status for a specific service
   */
  getStatus(serviceName?: string):
    | {
        state: CircuitState;
        failures: number;
        lastFailureTime: number;
        successesInHalfOpen: number;
        config: CircuitBreakerConfig;
      }
    | Record<
        string,
        {
          state: CircuitState;
          failures: number;
          lastFailureTime: number;
          successesInHalfOpen: number;
          config: CircuitBreakerConfig;
        }
      > {
    if (serviceName) {
      const serviceState = this.getServiceState(serviceName);
      return {
        state: serviceState.state,
        failures: serviceState.failures,
        lastFailureTime: serviceState.lastFailureTime,
        successesInHalfOpen: serviceState.successesInHalfOpen,
        config: this.getServiceConfig(serviceName),
      };
    }

    // Return all services status
    const allStatuses: Record<string, any> = {};
    for (const [name, state] of this.serviceStates.entries()) {
      allStatuses[name] = {
        state: state.state,
        failures: state.failures,
        lastFailureTime: state.lastFailureTime,
        successesInHalfOpen: state.successesInHalfOpen,
        config: this.getServiceConfig(name),
      };
    }
    return allStatuses;
  }

  /**
   * Force circuit breaker state for a specific service (for testing/admin purposes)
   */
  forceState(serviceName: string, state: CircuitState): void {
    this.updateServiceState(serviceName, { state });
    this.logger.warn(
      `Circuit breaker state for ${serviceName} forcibly set to ${state}`,
    );
  }

  /**
   * Legacy forceState method (deprecated)
   */
  forceStateGlobal(state: CircuitState): void {
    this.logger.warn(
      'forceStateGlobal() is deprecated. Use forceState(serviceName, state) instead.',
    );
    // Apply to all services (for backward compatibility during migration)
    for (const serviceName of this.serviceStates.keys()) {
      this.forceState(serviceName, state);
    }
  }
}
