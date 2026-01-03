import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Wallet } from './entities/wallet.entity';
import { Cashbox } from './entities/cashbox.entity';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { WebhookAttempt } from './entities/webhook-attempt.entity';
import { PaymentStatusChange } from './entities/payment-status-change.entity';
import { WalletRepository } from './repositories/wallet.repository';
import { CashboxRepository } from './repositories/cashbox.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { CashTransactionRepository } from './repositories/cash-transaction.repository';
import { WebhookAttemptRepository } from './repositories/webhook-attempt.repository';
import { PaymentStatusChangeRepository } from './repositories/payment-status-change.repository';
import { WalletService } from './services/wallet.service';
import { CashboxService } from './services/cashbox.service';
import { PaymentService } from './services/payment.service';
import { TransactionService } from './services/transaction.service';
import { CashTransactionService } from './services/cash-transaction.service';
import { WebhookService } from './services/webhook.service';
import { PaymentCleanupService } from './services/payment-cleanup.service';
import { PaymentStateMachineService } from './services/payment-state-machine.service';
import { PaymentsController } from './controllers/payments.controller';
import { WalletsController } from './controllers/wallets.controller';
import { CashboxesController } from './controllers/cashboxes.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { MeController } from './controllers/me.controller';
import { CentersModule } from '../centers/centers.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { SharedModule } from '@/shared/shared.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { UserProfileListener } from './listeners/user-profile.listener';
import { BranchListener } from './listeners/branch.listener';
import { FinanceMonitorService } from './monitoring/finance-monitor.service';

// Import metrics registry
import { FinanceMetrics } from './monitoring/metrics.registry';
export * from './monitoring/metrics.registry';

// Import payment gateway adapters
import { PaymentGatewayFactory } from './adapters/payment-gateway.factory';
import { PaymentGatewayService } from './adapters/payment-gateway.service';
import { PaymobAdapter } from './adapters/paymob.adapter';
import { PaymentGatewayCircuitBreaker } from './circuit-breaker/payment-gateway-circuit-breaker';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Cashbox,
      Payment,
      Transaction,
      CashTransaction,
      WebhookAttempt,
      PaymentStatusChange,
    ]),
    ScheduleModule.forRoot(), // For cron jobs
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
    CentersModule,
    UserProfileModule,
    SharedModule,
    AccessControlModule,
    UserModule,
  ],
  controllers: [
    PaymentsController,
    WalletsController,
    CashboxesController,
    WebhooksController,
    MeController,
  ],
  providers: [
    // Metrics providers
    FinanceMetrics.paymentTotal,
    FinanceMetrics.paymentCompletedTotal,
    FinanceMetrics.paymentFailedTotal,
    FinanceMetrics.transactionTotal,
    FinanceMetrics.walletBalance,
    FinanceMetrics.internalTransferTotal,
    FinanceMetrics.operationDuration,
    FinanceMetrics.lockWaitDuration,
    FinanceMetrics.insufficientFundsTotal,
    FinanceMetrics.lockTimeoutTotal,
    FinanceMetrics.errorsTotal,
    FinanceMetrics.circuitBreakerState,
    FinanceMetrics.circuitBreakerFailures,
    FinanceMetrics.circuitBreakerTransitions,
    FinanceMetrics.walletOpsCounter,
    FinanceMetrics.paymentOpsCounter,
    FinanceMetrics.stateTransitionsCounter,
    FinanceMetrics.invalidTransitionsCounter,
    FinanceMetrics.transitionDuration,

    // Webhook metrics
    FinanceMetrics.webhooksReceivedTotal,
    FinanceMetrics.webhooksProcessedTotal,
    FinanceMetrics.webhookProcessingDuration,

    // Refund metrics
    FinanceMetrics.refundsTotal,
    FinanceMetrics.refundsProcessedTotal,

    // Payment Gateway Adapters
    PaymentGatewayFactory,
    PaymentGatewayService,
    PaymentGatewayCircuitBreaker,

    // Services
    WalletRepository,
    CashboxRepository,
    PaymentRepository,
    TransactionRepository,
    CashTransactionRepository,
    WebhookAttemptRepository,
    PaymentStatusChangeRepository,
    WalletService,
    CashboxService,
    PaymentService,
    TransactionService,
    CashTransactionService,
    WebhookService,
    PaymentCleanupService,
    PaymentStateMachineService,
    FinanceMonitorService,
    UserProfileListener,
    BranchListener,
  ],
  exports: [
    // Payment Gateway Adapters
    PaymentGatewayFactory,
    PaymentGatewayService,

    WalletRepository,
    CashboxRepository,
    PaymentRepository,
    TransactionRepository,
    CashTransactionRepository,
    WebhookAttemptRepository,
    PaymentStatusChangeRepository,
    WalletService,
    CashboxService,
    PaymentService,
    TransactionService,
    CashTransactionService,
    WebhookService,
    PaymentCleanupService,
    PaymentStateMachineService,
    FinanceMonitorService,
  ],
})
export class FinanceModule {}
