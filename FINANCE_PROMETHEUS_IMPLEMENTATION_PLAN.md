# Finance Module - Prometheus Monitoring Implementation Plan

## 📊 Overview

This plan outlines the comprehensive implementation of Prometheus metrics for the entire Finance Module using `@willsoto/nestjs-prometheus`. The goal is to achieve **full observability** of financial operations with real-time monitoring, alerting, and performance insights.

## 🎯 Objectives

- **100% Service Coverage**: All finance services instrumented with metrics
- **Business KPI Monitoring**: Track revenue, payment success rates, failure patterns
- **Performance Monitoring**: Database query performance, lock wait times, API response times
- **Error Tracking**: Comprehensive error categorization and alerting
- **Operational Visibility**: Real-time dashboards and alerting for critical issues

## 📦 Phase 1: Core Setup & Infrastructure (Week 1)

### 1.1 Install Dependencies

```bash
✅ COMPLETED: Installed @willsoto/nestjs-prometheus and prom-client
```

### 1.2 Configure Prometheus Module

```typescript
// src/modules/finance/finance.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    // ... existing imports
    PrometheusModule.register({
      defaultLabels: {
        service: 'finance-service',
        version: '1.0.0',
      },
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'finance_',
        },
      },
    }),
  ],
  // ... rest of module
})
export class FinanceModule {}
```

### 1.3 Create Base Metrics Registry

```typescript
// src/modules/finance/monitoring/metrics.registry.ts
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

export const FinanceMetrics = {
  // HTTP Request Metrics
  httpRequestDuration: makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  // Database Metrics
  dbQueryDuration: makeHistogramProvider({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation', 'table', 'success'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  }),

  // Business Metrics
  paymentTotal: makeCounterProvider({
    name: 'payments_total',
    help: 'Total number of payments processed',
    labelNames: ['status', 'source', 'reason', 'amount_range'],
  }),

  walletBalance: makeGaugeProvider({
    name: 'wallet_balance',
    help: 'Current wallet balance',
    labelNames: ['wallet_id', 'owner_type', 'currency'],
  }),

  // Multi-Profile Transfer Metrics
  internalTransferTotal: makeCounterProvider({
    name: 'internal_transfer_total',
    help: 'Total value moved between profiles of the same user across centers',
    labelNames: [
      'user_id',
      'currency',
      'from_center',
      'to_center',
      'transfer_type',
    ],
  }),

  // Multi-Profile Transfer Metrics
  internalTransferTotal: makeCounterProvider({
    name: 'internal_transfer_total',
    help: 'Total value moved between profiles of the same user across centers',
    labelNames: [
      'user_id',
      'currency',
      'from_center',
      'to_center',
      'transfer_type',
    ],
  }),

  // Error Metrics
  errorsTotal: makeCounterProvider({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'operation', 'severity'],
  }),

  // Performance Metrics
  lockWaitDuration: makeHistogramProvider({
    name: 'lock_wait_duration_seconds',
    help: 'Time spent waiting for database locks',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  }),

  circuitBreakerState: makeGaugeProvider({
    name: 'circuit_breaker_state',
    help: 'Current state of circuit breaker (0=closed, 1=open, 2=half_open)',
    labelNames: ['service'],
  }),
};
```

## 📊 Phase 2: Service Layer Metrics (Week 2)

### 2.1 WalletService Metrics

```typescript
// src/modules/finance/services/wallet.service.ts
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prometheus-api-metrics';

@Injectable()
export class WalletService extends BaseService {
  @InjectMetric('finance_wallet_operations_total')
  private readonly walletOpsCounter: Counter<string>;

  @InjectMetric('finance_wallet_balance_updates_total')
  private readonly balanceUpdatesCounter: Counter<string>;

  @InjectMetric('finance_wallet_operation_duration_seconds')
  private readonly operationDuration: Histogram<string>;

  @InjectMetric('finance_wallet_lock_wait_duration_seconds')
  private readonly lockWaitDuration: Histogram<string>;

  @InjectMetric('finance_wallet_balance')
  private readonly walletBalanceGauge: Gauge<string>;

  async updateBalance(
    walletId: string,
    amount: Money,
    retryCount = 0,
  ): Promise<Wallet> {
    const startTime = Date.now();

    try {
      // Record lock acquisition attempt
      const lockStartTime = Date.now();
      const lockedWallet =
        await this.walletRepository.findOneWithLock(walletId);
      this.lockWaitDuration.observe(
        { operation: 'update_balance', wallet_id: walletId },
        (Date.now() - lockStartTime) / 1000,
      );

      // Pre-check validation
      const newBalance = lockedWallet.balance.add(amount);
      if (newBalance.isNegative()) {
        this.balanceUpdatesCounter.inc({
          operation: 'update_balance',
          result: 'insufficient_funds',
          amount_range: this.getAmountRange(amount),
        });
        throw new InsufficientFundsException('Insufficient balance');
      }

      // Perform update
      lockedWallet.balance = newBalance;
      const result = await this.walletRepository.saveWallet(lockedWallet);

      // Record success metrics
      this.balanceUpdatesCounter.inc({
        operation: 'update_balance',
        result: 'success',
        amount_range: this.getAmountRange(amount),
      });

      this.walletBalanceGauge.set(
        { wallet_id: walletId, type: 'total' },
        result.balance.toNumber(),
      );

      this.walletBalanceGauge.set(
        { wallet_id: walletId, type: 'available' },
        result.balance.subtract(result.lockedBalance).toNumber(),
      );

      this.operationDuration.observe(
        { operation: 'update_balance', result: 'success' },
        (Date.now() - startTime) / 1000,
      );

      return result;
    } catch (error) {
      this.operationDuration.observe(
        {
          operation: 'update_balance',
          result: 'error',
          error_type: error.name,
        },
        (Date.now() - startTime) / 1000,
      );

      if (
        error instanceof QueryFailedError &&
        (error.driverError?.code === '40001' ||
          error.driverError?.code === '40P01')
      ) {
        // Handle retry logic with metrics
        if (retryCount < MAX_RETRIES) {
          this.balanceUpdatesCounter.inc({
            operation: 'update_balance',
            result: 'retry',
            retry_count: retryCount.toString(),
          });
          return this.updateBalance(walletId, amount, retryCount + 1);
        }
      }

      throw error;
    }
  }

  async getWallet(
    ownerId: string,
    ownerType: WalletOwnerType,
  ): Promise<Wallet> {
    const startTime = Date.now();

    try {
      let wallet = await this.walletRepository.findByOwner(ownerId, ownerType);

      if (!wallet) {
        this.walletOpsCounter.inc({
          operation: 'get_wallet',
          result: 'created',
        });
        wallet = await this.walletRepository.create({
          ownerId,
          ownerType,
          balance: Money.zero(),
          bonusBalance: Money.zero(),
          lockedBalance: Money.zero(),
        });
      } else {
        this.walletOpsCounter.inc({ operation: 'get_wallet', result: 'found' });
      }

      // Update balance gauges
      this.walletBalanceGauge.set(
        { wallet_id: wallet.id, type: 'total' },
        wallet.balance.toNumber(),
      );
      this.walletBalanceGauge.set(
        { wallet_id: wallet.id, type: 'available' },
        wallet.balance.subtract(wallet.lockedBalance).toNumber(),
      );

      this.operationDuration.observe(
        { operation: 'get_wallet', result: 'success' },
        (Date.now() - startTime) / 1000,
      );

      return wallet;
    } catch (error) {
      this.operationDuration.observe(
        { operation: 'get_wallet', result: 'error', error_type: error.name },
        (Date.now() - startTime) / 1000,
      );
      throw error;
    }
  }
}
```

### 2.2 PaymentService Metrics

```typescript
// src/modules/finance/services/payment.service.ts
@Injectable()
export class PaymentService extends BaseService {
  @InjectMetric('finance_payment_operations_total')
  private readonly paymentOpsCounter: Counter<string>;

  @InjectMetric('finance_payment_amount_total')
  private readonly paymentAmountCounter: Counter<string>;

  @InjectMetric('finance_payment_operation_duration_seconds')
  private readonly operationDuration: Histogram<string>;

  @InjectMetric('finance_payment_status_changes_total')
  private readonly statusChangesCounter: Counter<string>;

  async createPayment(
    amount: Money,
    payerProfileId: string,
    receiverId: string,
    receiverType: WalletOwnerType,
    reason: PaymentReason,
    source: PaymentSource,
    referenceType?: PaymentReferenceType,
    referenceId?: string,
    correlationId?: string,
    idempotencyKey?: string,
  ): Promise<Payment> {
    const startTime = Date.now();

    try {
      // Idempotency check
      if (idempotencyKey) {
        const existingPayments = await this.paymentRepository.findByIdempotencyKey(
          idempotencyKey,
          payerProfileId,
        );

        if (existingPayments.length > 0) {
          this.paymentOpsCounter.inc({
            operation: 'create_payment',
            result: 'idempotent',
            source: source,
            reason: reason,
          });
          return existingPayments[0];
        }
      }

      // Create payment logic...
      const payment = await this.paymentRepository.create({ ... });

      // Record metrics
      this.paymentOpsCounter.inc({
        operation: 'create_payment',
        result: 'created',
        source: source,
        reason: reason,
        status: 'pending',
      });

      this.paymentAmountCounter.inc({
        operation: 'create_payment',
        source: source,
        reason: reason,
        amount_range: this.getAmountRange(amount),
      }, amount.toNumber());

      this.operationDuration.observe(
        { operation: 'create_payment', result: 'success' },
        (Date.now() - startTime) / 1000
      );

      return payment;

    } catch (error) {
      this.paymentOpsCounter.inc({
        operation: 'create_payment',
        result: 'error',
        error_type: error.name,
        source: source,
        reason: reason,
      });

      this.operationDuration.observe(
        { operation: 'create_payment', result: 'error', error_type: error.name },
        (Date.now() - startTime) / 1000
      );

      throw error;
    }
  }

  async completePayment(paymentId: string): Promise<Payment> {
    const startTime = Date.now();
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    try {
      // Completion logic...
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();

      const updatedPayment = await this.paymentRepository.savePayment(payment);

      // Record status change
      this.statusChangesCounter.inc({
        from_status: PaymentStatus.PENDING,
        to_status: PaymentStatus.COMPLETED,
        operation: 'complete_payment',
        source: payment.source,
        reason: payment.reason,
      });

      this.operationDuration.observe(
        { operation: 'complete_payment', result: 'success' },
        (Date.now() - startTime) / 1000
      );

      return updatedPayment;

    } catch (error) {
      this.operationDuration.observe(
        { operation: 'complete_payment', result: 'error', error_type: error.name },
        (Date.now() - startTime) / 1000
      );
      throw error;
    }
  }
}
```

### 2.3 PaymentStateMachine Metrics

```typescript
// src/modules/finance/services/payment-state-machine.service.ts
@Injectable()
export class PaymentStateMachineService {
  @InjectMetric('finance_state_machine_transitions_total')
  private readonly transitionsCounter: Counter<string>;

  @InjectMetric('finance_state_machine_invalid_transitions_total')
  private readonly invalidTransitionsCounter: Counter<string>;

  @InjectMetric('finance_state_machine_transition_duration_seconds')
  private readonly transitionDuration: Histogram<string>;

  async validateAndExecuteTransition(
    paymentId: string,
    targetStatus: PaymentStatus,
    userProfileId: string,
    reason?: string,
  ): Promise<Payment> {
    const startTime = Date.now();

    try {
      const payment = await this.paymentRepository.findOneOrThrow(paymentId);
      const transition = PaymentStateMachine.getTransition(
        payment.status,
        targetStatus,
      );

      if (!transition) {
        this.invalidTransitionsCounter.inc({
          from_status: payment.status,
          to_status: targetStatus,
          user_type: await this.getUserType(userProfileId),
        });
        throw new Error(`Invalid transition`);
      }

      // Check super admin requirement
      if (transition.requiresSuperAdmin) {
        const isSuperAdmin =
          await this.accessControlHelperService.isSuperAdmin(userProfileId);
        if (!isSuperAdmin) {
          this.invalidTransitionsCounter.inc({
            from_status: payment.status,
            to_status: targetStatus,
            reason: 'insufficient_permissions',
          });
          throw new InsufficientPermissionsException('Super admin required');
        }
      }

      const updatedPayment = await this.executeTransition(payment, transition);

      // Record successful transition
      this.transitionsCounter.inc({
        from_status: payment.status,
        to_status: updatedPayment.status,
        transition_type: transition.type,
        user_type: await this.getUserType(userProfileId),
        business_logic: transition.businessLogic,
      });

      this.transitionDuration.observe(
        { transition_type: transition.type, result: 'success' },
        (Date.now() - startTime) / 1000,
      );

      return updatedPayment;
    } catch (error) {
      this.transitionDuration.observe(
        { transition_type: 'unknown', result: 'error', error_type: error.name },
        (Date.now() - startTime) / 1000,
      );
      throw error;
    }
  }

  private async getUserType(userProfileId: string): Promise<string> {
    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(userProfileId);
    if (isSuperAdmin) return 'super_admin';

    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);
    return isAdmin ? 'admin' : 'regular';
  }
}
```

## 🌐 Phase 3: Controller Layer Metrics (Week 3)

### 3.1 HTTP Request Metrics

```typescript
// src/modules/finance/monitoring/finance.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prometheus-api-metrics';

@Injectable()
export class FinanceMetricsInterceptor implements NestInterceptor {
  @InjectMetric('finance_http_request_duration_seconds')
  private readonly httpRequestDuration: Histogram<string>;

  @InjectMetric('finance_http_requests_total')
  private readonly httpRequestsTotal: Counter<string>;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const route = this.getRoute(request);
        const method = request.method;
        const statusCode = response.statusCode;

        this.httpRequestDuration.observe(
          { method, route, status_code: statusCode.toString() },
          duration,
        );

        this.httpRequestsTotal.inc({
          method,
          route,
          status_code: statusCode.toString(),
        });
      }),
    );
  }

  private getRoute(request: any): string {
    return request.route?.path || request.url || 'unknown';
  }
}
```

### 3.2 Controller-Specific Metrics

```typescript
// src/modules/finance/controllers/payments.controller.ts
@Controller('finance/payments')
@UseInterceptors(FinanceMetricsInterceptor)
export class PaymentsController {
  @InjectMetric('finance_payment_controller_operations_total')
  private readonly controllerOpsCounter: Counter<string>;

  @Post()
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(
    @Body() dto: CreatePaymentDto,
  ): Promise<ControllerResponse<Payment>> {
    try {
      const payment = await this.paymentService.createPayment({ ...dto });

      this.controllerOpsCounter.inc({
        controller: 'payments',
        operation: 'create',
        result: 'success',
        source: dto.source,
        reason: dto.reason,
      });

      return {
        data: payment,
        message: {
          key: 't.messages.created',
          args: { resource: 't.resources.payment' },
        },
      };
    } catch (error) {
      this.controllerOpsCounter.inc({
        controller: 'payments',
        operation: 'create',
        result: 'error',
        error_type: error.constructor.name,
      });
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  async listPayments(
    @Query() dto: PaginatePaymentDto,
  ): Promise<ControllerResponse<Pagination<Payment>>> {
    try {
      const payments = await this.paymentService.paginatePayments(dto);

      this.controllerOpsCounter.inc({
        controller: 'payments',
        operation: 'list',
        result: 'success',
        has_filters: this.hasFilters(dto).toString(),
      });

      return {
        data: payments,
        message: {
          key: 't.messages.found',
          args: { resource: 't.resources.payments' },
        },
      };
    } catch (error) {
      this.controllerOpsCounter.inc({
        controller: 'payments',
        operation: 'list',
        result: 'error',
        error_type: error.constructor.name,
      });
      throw error;
    }
  }

  private hasFilters(dto: PaginatePaymentDto): boolean {
    return !!(dto.status || dto.reason || dto.source || dto.payerProfileId);
  }
}
```

## 💾 Phase 4: Repository Layer Metrics (Week 4)

### 4.1 Database Query Metrics

```typescript
// src/modules/finance/repositories/payment.repository.ts
@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  @InjectMetric('finance_db_query_duration_seconds')
  private readonly queryDuration: Histogram<string>;

  @InjectMetric('finance_db_queries_total')
  private readonly queryCounter: Counter<string>;

  async findByIdempotencyKey(
    idempotencyKey: string,
    payerProfileId: string,
  ): Promise<Payment[]> {
    const startTime = Date.now();

    try {
      const result = await this.getRepository().find({
        where: { idempotencyKey, payerProfileId } as any,
      });

      this.queryDuration.observe(
        {
          operation: 'find_by_idempotency_key',
          table: 'payments',
          success: 'true',
        },
        (Date.now() - startTime) / 1000,
      );

      this.queryCounter.inc({
        operation: 'find_by_idempotency_key',
        table: 'payments',
        result_count: result.length.toString(),
      });

      return result;
    } catch (error) {
      this.queryDuration.observe(
        {
          operation: 'find_by_idempotency_key',
          table: 'payments',
          success: 'false',
        },
        (Date.now() - startTime) / 1000,
      );

      this.queryCounter.inc({
        operation: 'find_by_idempotency_key',
        table: 'payments',
        error_type: error.constructor.name,
      });

      throw error;
    }
  }

  async createQueryBuilder(alias: string): SelectQueryBuilder<Payment> {
    const startTime = Date.now();

    try {
      const qb = this.getRepository().createQueryBuilder(alias);

      // Add metrics for query builder creation
      this.queryCounter.inc({
        operation: 'create_query_builder',
        table: 'payments',
        alias,
      });

      // Return a wrapped query builder that tracks execution
      return this.wrapQueryBuilder(qb, alias);
    } catch (error) {
      this.queryDuration.observe(
        {
          operation: 'create_query_builder',
          table: 'payments',
          success: 'false',
        },
        (Date.now() - startTime) / 1000,
      );
      throw error;
    }
  }

  private wrapQueryBuilder(
    qb: SelectQueryBuilder<Payment>,
    alias: string,
  ): SelectQueryBuilder<Payment> {
    const originalGetMany = qb.getMany.bind(qb);
    const originalGetOne = qb.getOne.bind(qb);
    const originalGetRawMany = qb.getRawMany.bind(qb);

    qb.getMany = async () => {
      const startTime = Date.now();
      try {
        const result = await originalGetMany();
        this.recordQueryExecution(
          'get_many',
          alias,
          result.length,
          Date.now() - startTime,
        );
        return result;
      } catch (error) {
        this.recordQueryError('get_many', alias, error, Date.now() - startTime);
        throw error;
      }
    };

    qb.getOne = async () => {
      const startTime = Date.now();
      try {
        const result = await originalGetOne();
        this.recordQueryExecution(
          'get_one',
          alias,
          result ? 1 : 0,
          Date.now() - startTime,
        );
        return result;
      } catch (error) {
        this.recordQueryError('get_one', alias, error, Date.now() - startTime);
        throw error;
      }
    };

    qb.getRawMany = async () => {
      const startTime = Date.now();
      try {
        const result = await originalGetRawMany();
        this.recordQueryExecution(
          'get_raw_many',
          alias,
          result.length,
          Date.now() - startTime,
        );
        return result;
      } catch (error) {
        this.recordQueryError(
          'get_raw_many',
          alias,
          error,
          Date.now() - startTime,
        );
        throw error;
      }
    };

    return qb;
  }

  private recordQueryExecution(
    operation: string,
    alias: string,
    resultCount: number,
    durationMs: number,
  ) {
    this.queryDuration.observe(
      { operation, table: 'payments', alias, success: 'true' },
      durationMs / 1000,
    );

    this.queryCounter.inc({
      operation,
      table: 'payments',
      alias,
      result_count: this.categorizeResultCount(resultCount),
    });
  }

  private recordQueryError(
    operation: string,
    alias: string,
    error: any,
    durationMs: number,
  ) {
    this.queryDuration.observe(
      { operation, table: 'payments', alias, success: 'false' },
      durationMs / 1000,
    );

    this.queryCounter.inc({
      operation,
      table: 'payments',
      alias,
      error_type: error.constructor.name,
    });
  }

  private categorizeResultCount(count: number): string {
    if (count === 0) return '0';
    if (count === 1) return '1';
    if (count <= 10) return '2-10';
    if (count <= 100) return '11-100';
    return '100+';
  }
}
```

## 🔄 Phase 5: Circuit Breaker & External Service Metrics (Week 5)

### 5.1 Circuit Breaker Metrics

```typescript
// src/modules/finance/circuit-breaker/payment-gateway-circuit-breaker.ts
@Injectable()
export class PaymentGatewayCircuitBreaker {
  @InjectMetric('finance_circuit_breaker_state')
  private readonly circuitBreakerState: Gauge<string>;

  @InjectMetric('finance_circuit_breaker_transitions_total')
  private readonly stateTransitionsCounter: Counter<string>;

  @InjectMetric('finance_circuit_breaker_failures_total')
  private readonly failuresCounter: Counter<string>;

  async execute<T>(
    operation: () => Promise<T>,
    serviceName: string,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    // Update current state metric
    this.circuitBreakerState.set(
      { service: serviceName },
      this.getStateValue(this.state),
    );

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToState(
          CircuitState.HALF_OPEN,
          serviceName,
          'timeout_reset',
        );
      } else {
        this.failuresCounter.inc({
          service: serviceName,
          reason: 'circuit_open',
          state: 'open',
        });

        if (fallback) {
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
        return fallback();
      }
      throw error;
    }
  }

  private recordSuccess(serviceName: string): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successesInHalfOpen++;
      if (this.successesInHalfOpen >= this.config.successThreshold) {
        this.transitionToState(
          CircuitState.CLOSED,
          serviceName,
          'success_threshold',
        );
      }
    }
  }

  private recordFailure(serviceName: string, error: any): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    this.failuresCounter.inc({
      service: serviceName,
      error_type: error.constructor.name,
      state: this.state,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToState(
        CircuitState.OPEN,
        serviceName,
        'half_open_failure',
      );
    } else if (this.failures >= this.config.failureThreshold) {
      this.transitionToState(
        CircuitState.OPEN,
        serviceName,
        'failure_threshold',
      );
    }
  }

  private transitionToState(
    newState: CircuitState,
    serviceName: string,
    reason: string,
  ): void {
    const oldState = this.state;
    this.state = newState;

    this.circuitBreakerState.set(
      { service: serviceName },
      this.getStateValue(newState),
    );

    this.stateTransitionsCounter.inc({
      service: serviceName,
      from_state: oldState,
      to_state: newState,
      reason,
    });
  }

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
}
```

### 5.2 Circuit Breaker Criticality for Payment Gateways

**Why Circuit Breakers are Essential for Paymob Integration:**

When your server depends on Paymob's API, failures create cascading effects:

1. **Database Connection Exhaustion**: If Paymob is slow, your `WalletService.updateBalance()` waits, keeping database connections open
2. **Application Freezing**: Slow external calls block your NestJS event loop
3. **Resource Starvation**: Connection pools get depleted, affecting other operations
4. **Complete System Failure**: Without circuit breakers, your entire LMS could crash

**Circuit Breaker Solution:**

- **Monitored by Prometheus**: `finance_circuit_breaker_state{service="paymob"}` shows OPEN/CLOSED status
- **Automatic Recovery**: When Paymob recovers, circuit breaker gradually allows requests
- **Graceful Degradation**: Shows "Payment Gateway Temporarily Unavailable" instead of crashing
- **Fast Failure**: Immediately rejects requests when Paymob is down, freeing resources

### 5.3 Webhook Metrics

```typescript
// src/modules/finance/middleware/webhook-security.middleware.ts
@Injectable()
export class WebhookSecurityMiddleware implements NestMiddleware {
  @InjectMetric('finance_webhook_requests_total')
  private readonly webhookRequestsCounter: Counter<string>;

  @InjectMetric('finance_webhook_security_validations_total')
  private readonly securityValidationsCounter: Counter<string>;

  @InjectMetric('finance_webhook_rate_limit_hits_total')
  private readonly rateLimitHitsCounter: Counter<string>;

  use(req: Request, res: Response, next: NextFunction) {
    const clientIP = this.getClientIP(req);
    const provider = this.getProviderFromPath(req.path);
    const startTime = Date.now();

    try {
      // IP Whitelisting validation
      if (!this.isAllowedIP(clientIP, provider)) {
        this.securityValidationsCounter.inc({
          validation_type: 'ip_whitelist',
          provider,
          result: 'blocked',
        });
        throw new BadRequestException('Unauthorized IP address');
      }

      this.securityValidationsCounter.inc({
        validation_type: 'ip_whitelist',
        provider,
        result: 'allowed',
      });

      // Rate limiting
      if (!this.checkRateLimit(clientIP)) {
        this.rateLimitHitsCounter.inc({
          provider,
          ip: clientIP,
        });
        throw new BadRequestException('Rate limit exceeded');
      }

      // Payload validation
      if (!req.body || typeof req.body !== 'object') {
        this.securityValidationsCounter.inc({
          validation_type: 'payload',
          provider,
          result: 'invalid',
        });
        throw new BadRequestException('Invalid webhook payload');
      }

      this.securityValidationsCounter.inc({
        validation_type: 'payload',
        provider,
        result: 'valid',
      });

      // Track successful webhook reception
      this.webhookRequestsCounter.inc({
        provider,
        status: 'accepted',
        ip: clientIP,
      });

      next();
    } catch (error) {
      this.webhookRequestsCounter.inc({
        provider,
        status: 'rejected',
        error_type: error.constructor.name,
        ip: clientIP,
      });
      throw error;
    }
  }
}
```

## 📈 Phase 6: Business Intelligence Metrics (Week 6)

### 6.1 Revenue & Financial KPIs

```typescript
// src/modules/finance/monitoring/business-intelligence.service.ts
@Injectable()
export class BusinessIntelligenceService {
  @InjectMetric('finance_revenue_total')
  private readonly revenueCounter: Counter<string>;

  @InjectMetric('finance_refund_amount_total')
  private readonly refundCounter: Counter<string>;

  @InjectMetric('finance_payment_success_rate')
  private readonly successRateGauge: Gauge<string>;

  @InjectMetric('finance_average_payment_amount')
  private readonly avgPaymentAmount: Histogram<string>;

  @InjectMetric('finance_wallet_growth_rate')
  private readonly walletGrowthGauge: Gauge<string>;

  // Track revenue by different dimensions
  recordRevenue(
    amount: Money,
    source: PaymentSource,
    reason: PaymentReason,
    period: string = 'daily',
  ): void {
    this.revenueCounter.inc(
      {
        source,
        reason,
        period,
        amount_range: this.getAmountRange(amount),
      },
      amount.toNumber(),
    );
  }

  // Track refunds separately
  recordRefund(
    amount: Money,
    source: PaymentSource,
    reason: string,
    period: string = 'daily',
  ): void {
    this.refundCounter.inc(
      {
        source,
        reason,
        period,
        amount_range: this.getAmountRange(amount),
      },
      amount.toNumber(),
    );
  }

  // Calculate and update success rates
  async updatePaymentSuccessRate(timeRange: string = '1h'): Promise<void> {
    // Query successful vs total payments in time range
    const successRate = await this.calculateSuccessRate(timeRange);

    this.successRateGauge.set(
      { time_range: timeRange, metric: 'payment_success' },
      successRate,
    );
  }

  // Track payment amount distributions
  recordPaymentAmount(
    amount: Money,
    source: PaymentSource,
    status: PaymentStatus,
  ): void {
    this.avgPaymentAmount.observe(
      { source, status, amount_range: this.getAmountRange(amount) },
      amount.toNumber(),
    );
  }

  // Track wallet balance growth
  async updateWalletGrowthMetrics(): Promise<void> {
    const growthRate = await this.calculateWalletGrowthRate();

    this.walletGrowthGauge.set(
      { metric: 'balance_growth_rate', period: 'daily' },
      growthRate,
    );
  }

  private async calculateSuccessRate(timeRange: string): Promise<number> {
    // Implementation to calculate success rate from database
    // This would query payment counts by status within time range
    return 0.95; // Placeholder
  }

  private async calculateWalletGrowthRate(): Promise<number> {
    // Implementation to calculate wallet balance growth
    // Compare current total balances vs previous period
    return 0.05; // Placeholder - 5% growth
  }

  private getAmountRange(amount: Money): string {
    const value = amount.toNumber();
    if (value < 10) return '0-10';
    if (value < 100) return '10-100';
    if (value < 1000) return '100-1000';
    if (value < 10000) return '1000-10000';
    return '10000+';
  }
}
```

## 🚨 Phase 7: Alerting & Dashboard Configuration (Week 7)

### 7.1 Prometheus Alerting Rules

```yaml
# prometheus/alert_rules.yml
groups:
  - name: finance.alerts
    rules:
      # Critical Business Alerts
      - alert: FinancePaymentFailureRateHigh
        expr: rate(finance_payments_total{result="error"}[5m]) / rate(finance_payments_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          service: finance
        annotations:
          summary: "High payment failure rate detected"
          description: "Payment failure rate is {{ $value | printf "%.2f" }}% over last 5 minutes"

      - alert: FinanceCircuitBreakerOpen
        expr: finance_circuit_breaker_state{state="open"} == 1
        for: 1m
        labels:
          severity: warning
          service: finance
        annotations:
          summary: "Circuit breaker opened for external service"
          description: "Circuit breaker for {{ $labels.service }} is OPEN"

      # Performance Alerts
      - alert: FinanceHighLockWaitTime
        expr: histogram_quantile(0.95, rate(finance_lock_wait_duration_seconds_bucket[5m])) > 2
        for: 3m
        labels:
          severity: warning
          service: finance
        annotations:
          summary: "High database lock wait times"
          description: "95th percentile lock wait time is {{ $value }}s"

      - alert: FinanceSlowPaymentProcessing
        expr: histogram_quantile(0.95, rate(finance_payment_operation_duration_seconds_bucket{operation="complete_payment"}[5m])) > 10
        for: 5m
        labels:
          severity: warning
          service: finance
        annotations:
          summary: "Slow payment processing detected"
          description: "95th percentile payment completion time is {{ $value }}s"

      # Business Metric Alerts
      - alert: FinanceRevenueDrop
        expr: rate(finance_revenue_total[1h]) < rate(finance_revenue_total[1h] offset 24h) * 0.5
        for: 15m
        labels:
          severity: warning
          service: finance
        annotations:
          summary: "Revenue drop detected"
          description: "Revenue dropped by more than 50% compared to yesterday"

      # Security Alerts
      - alert: FinanceWebhookIPViolation
        expr: rate(finance_webhook_security_validations_total{result="blocked"}[5m]) > 0
        for: 1m
        labels:
          severity: critical
          service: finance
        annotations:
          summary: "Unauthorized webhook access attempt"
          description: "Blocked webhook request from unauthorized IP"

      - alert: FinanceRateLimitExceeded
        expr: rate(finance_webhook_rate_limit_hits_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
          service: finance
        annotations:
          summary: "High rate of rate limit hits"
          description: "{{ $value }} rate limit violations in 5 minutes"
```

### 7.2 Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Finance Module Overview",
    "tags": ["finance", "payments", "monitoring"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "Payment Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(finance_payments_total{result=\"success\"}[5m]) / rate(finance_payments_total[5m]) * 100",
            "legendFormat": "Success Rate %"
          }
        ]
      },
      {
        "title": "Revenue Trend",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(finance_revenue_total[1h])",
            "legendFormat": "Revenue per Hour"
          }
        ]
      },
      {
        "title": "Payment Processing Time",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(finance_payment_operation_duration_seconds_bucket[5m])",
            "legendFormat": "{{ operation }}"
          }
        ]
      },
      {
        "title": "Circuit Breaker Status",
        "type": "table",
        "targets": [
          {
            "expr": "finance_circuit_breaker_state",
            "legendFormat": "{{ service }}"
          }
        ]
      }
    ]
  }
}
```

## 🧪 Phase 8: Testing & Validation (Week 8)

### 8.1 Metrics Testing

```typescript
// src/modules/finance/test/metrics.spec.ts
describe('FinanceMetrics', () => {
  let metricsService: FinanceMonitorService;

  beforeEach(async () => {
    // Setup metrics registry for testing
  });

  it('should record payment creation metrics', async () => {
    const amount = Money.from(100.0);

    await metricsService.recordPaymentCreated(amount, 'wallet', 'session');

    // Verify metrics were recorded
    expect(
      metricsRegistry.getCounterValue('finance_payments_total', {
        status: 'created',
        source: 'wallet',
        reason: 'session',
        amount_range: '100-1000',
      }),
    ).toBe(1);
  });

  it('should track wallet balance changes', async () => {
    const walletId = 'wallet-123';
    const balance = Money.from(500.0);
    const lockedBalance = Money.from(100.0);

    await metricsService.updateWalletBalance(walletId, balance, lockedBalance);

    expect(
      metricsRegistry.getGaugeValue('finance_wallet_balance', {
        wallet_id: walletId,
        type: 'available',
      }),
    ).toBe(400.0);
  });

  it('should handle circuit breaker state transitions', async () => {
    const circuitBreaker = new PaymentGatewayCircuitBreaker();

    // Simulate failures
    for (let i = 0; i < 6; i++) {
      try {
        await circuitBreaker.execute(
          () => Promise.reject(new Error('test')),
          'stripe',
        );
      } catch (e) {
        // Expected
      }
    }

    // Verify circuit breaker opened
    expect(
      metricsRegistry.getGaugeValue('finance_circuit_breaker_state', {
        service: 'stripe',
      }),
    ).toBe(1); // OPEN state
  });
});
```

## 📋 Implementation Checklist

### Phase 1: Core Setup ✅

- [x] Install @willsoto/nestjs-prometheus
- [x] Configure Prometheus module
- [x] Create metrics registry

### Phase 2: Service Layer Metrics 🔄

- [x] WalletService metrics
- [x] PaymentService metrics
- [x] PaymentStateMachine metrics
- [ ] CashboxService metrics
- [ ] TransactionService metrics
- [ ] WebhookService metrics

### Phase 3: Controller Layer Metrics ⏳

- [ ] HTTP request interceptor
- [ ] PaymentsController metrics
- [ ] WalletsController metrics
- [ ] FinanceActionsController metrics
- [ ] WebhooksController metrics

### Phase 4: Repository Layer Metrics ⏳

- [ ] PaymentRepository metrics
- [ ] WalletRepository metrics
- [ ] TransactionRepository metrics
- [ ] CashTransactionRepository metrics

### Phase 5: Circuit Breaker Metrics ⏳

- [x] Circuit breaker state tracking
- [ ] Webhook security metrics
- [ ] External service metrics

### Phase 6: Business Intelligence Metrics ⏳

- [ ] Revenue tracking
- [ ] Success rate calculations
- [ ] Payment amount distributions
- [ ] Wallet growth metrics

### Phase 7: Alerting & Dashboards ⏳

- [ ] Prometheus alerting rules
- [ ] Grafana dashboard
- [ ] Alert manager configuration

### Phase 8: Testing & Validation ⏳

- [ ] Unit tests for metrics
- [ ] Integration tests
- [ ] Load testing with metrics
- [ ] Metrics validation scripts

## 🎯 Success Criteria

- **100% Coverage**: All finance module components emit metrics
- **Business KPIs**: Revenue, success rates, failure patterns tracked
- **Performance Monitoring**: <2s P95 payment processing time
- **Alerting**: <5min MTTR for critical issues
- **Observability**: Full request tracing and error correlation
- **Scalability**: Metrics scale with payment volume

## 🚀 Next Steps

1. **Week 1**: Complete service layer metrics implementation
2. **Week 2**: Add controller and repository metrics
3. **Week 3**: Implement circuit breaker and webhook metrics
4. **Week 4**: Add business intelligence metrics
5. **Week 5**: Create alerting rules and Grafana dashboards
6. **Week 6**: Comprehensive testing and validation
7. **Week 7**: Production deployment and monitoring
8. **Week 8**: Performance optimization and fine-tuning

This implementation will provide **enterprise-grade observability** for the Finance Module, enabling proactive monitoring, rapid issue detection, and data-driven optimization.
