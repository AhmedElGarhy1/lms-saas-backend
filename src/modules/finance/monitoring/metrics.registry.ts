import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

// Business Metrics
export const FinanceMetrics = {
  paymentTotal: makeCounterProvider({
    name: 'finance_payments_total',
    help: 'Total number of payments processed',
    labelNames: ['status', 'source', 'reason', 'amount_range'],
  }),

  paymentCompletedTotal: makeCounterProvider({
    name: 'finance_payments_completed_total',
    help: 'Total number of completed payments',
    labelNames: ['status', 'source', 'reason', 'amount_range'],
  }),

  paymentFailedTotal: makeCounterProvider({
    name: 'finance_payments_failed_total',
    help: 'Total number of failed payments',
    labelNames: ['status', 'source', 'reason', 'error_type'],
  }),

  transactionTotal: makeCounterProvider({
    name: 'finance_transactions_total',
    help: 'Total number of transactions',
    labelNames: ['type', 'amount_range'],
  }),

  walletBalance: makeGaugeProvider({
    name: 'finance_wallet_balance',
    help: 'Current wallet balance',
    labelNames: ['wallet_id', 'owner_type', 'currency'],
  }),

  // Multi-Profile Transfer Metrics
  internalTransferTotal: makeCounterProvider({
    name: 'finance_internal_transfer_total',
    help: 'Total value moved between profiles of the same user across centers',
    labelNames: [
      'user_id',
      'currency',
      'from_center',
      'to_center',
      'transfer_type',
    ],
  }),

  // Performance Metrics
  operationDuration: makeHistogramProvider({
    name: 'finance_operation_duration_seconds',
    help: 'Duration of operations',
    labelNames: ['operation', 'result'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),

  lockWaitDuration: makeHistogramProvider({
    name: 'finance_lock_wait_duration_seconds',
    help: 'Time spent waiting for database locks',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  }),

  // Error Metrics
  insufficientFundsTotal: makeCounterProvider({
    name: 'finance_insufficient_funds_total',
    help: 'Total insufficient funds errors',
    labelNames: ['wallet_id', 'amount_range'],
  }),

  lockTimeoutTotal: makeCounterProvider({
    name: 'finance_lock_timeout_total',
    help: 'Total lock timeout errors',
    labelNames: ['operation', 'wallet_id', 'retry_count'],
  }),

  // Error Metrics
  errorsTotal: makeCounterProvider({
    name: 'finance_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'operation', 'severity'],
  }),

  // Circuit Breaker Metrics
  circuitBreakerState: makeGaugeProvider({
    name: 'finance_circuit_breaker_state',
    help: 'Current state of circuit breaker (0=closed, 1=open, 2=half_open)',
    labelNames: ['service'],
  }),

  circuitBreakerFailures: makeCounterProvider({
    name: 'finance_circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['service', 'error_type', 'state'],
  }),

  circuitBreakerTransitions: makeCounterProvider({
    name: 'finance_circuit_breaker_state_transitions_total',
    help: 'Total number of circuit breaker state transitions',
    labelNames: ['service', 'from_state', 'to_state', 'reason'],
  }),

  // Operation Metrics
  walletOpsCounter: makeCounterProvider({
    name: 'finance_wallet_operations_total',
    help: 'Total wallet operations',
    labelNames: ['operation', 'result'],
  }),

  paymentOpsCounter: makeCounterProvider({
    name: 'finance_payment_operations_total',
    help: 'Total payment operations',
    labelNames: ['operation', 'result', 'source', 'reason'],
  }),

  // State Machine Metrics
  stateTransitionsCounter: makeCounterProvider({
    name: 'finance_state_machine_transitions_total',
    help: 'Total payment state machine transitions',
    labelNames: [
      'from_status',
      'to_status',
      'transition_type',
      'user_type',
      'business_logic',
    ],
  }),

  invalidTransitionsCounter: makeCounterProvider({
    name: 'finance_state_machine_invalid_transitions_total',
    help: 'Total invalid payment state transitions',
    labelNames: ['from_status', 'to_status', 'user_type', 'reason'],
  }),

  transitionDuration: makeHistogramProvider({
    name: 'finance_state_machine_transition_duration_seconds',
    help: 'Duration of state transitions',
    labelNames: ['transition_type', 'result'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  }),

  // Webhook metrics
  webhooksReceivedTotal: makeCounterProvider({
    name: 'finance_webhooks_received_total',
    help: 'Total webhooks received',
    labelNames: ['provider', 'result'],
  }),

  webhooksProcessedTotal: makeCounterProvider({
    name: 'finance_webhooks_processed_total',
    help: 'Total webhooks processed successfully',
    labelNames: ['provider', 'event_type'],
  }),

  webhookProcessingDuration: makeHistogramProvider({
    name: 'finance_webhook_processing_duration_seconds',
    help: 'Duration of webhook processing',
    labelNames: ['provider', 'result'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  }),

  // Refund metrics
  refundsTotal: makeCounterProvider({
    name: 'finance_refunds_total',
    help: 'Total refund amount requested',
    labelNames: ['currency', 'gateway'],
  }),

  refundsProcessedTotal: makeCounterProvider({
    name: 'finance_refunds_processed_total',
    help: 'Total refund amount successfully processed',
    labelNames: ['currency', 'gateway', 'result'],
  }),
};
