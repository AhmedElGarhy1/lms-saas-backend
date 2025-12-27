import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableCheck } from 'typeorm';

export class CreateFinanceTables1734567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallets table
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'ownerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'ownerType',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
            isNullable: false,
          },
          {
            name: 'bonusBalance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
            isNullable: false,
          },
          {
            name: 'lockedBalance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create wallets indexes
    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_wallets_ownerId_ownerType',
        columnNames: ['ownerId', 'ownerType'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_wallets_ownerId',
        columnNames: ['ownerId'],
      }),
    );
    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_wallets_ownerType',
        columnNames: ['ownerType'],
      }),
    );

    // Create wallets check constraint
    await queryRunner.createCheckConstraint(
      'wallets',
      new TableCheck({
        name: 'CHK_wallets_balance_positive',
        expression: 'balance >= 0',
      }),
    );
    await queryRunner.createCheckConstraint(
      'wallets',
      new TableCheck({
        name: 'CHK_wallets_bonusBalance_positive',
        expression: 'bonusBalance >= 0',
      }),
    );
    await queryRunner.createCheckConstraint(
      'wallets',
      new TableCheck({
        name: 'CHK_wallets_lockedBalance_positive',
        expression: 'lockedBalance >= 0',
      }),
    );

    // Create cashboxes table
    await queryRunner.createTable(
      new Table({
        name: 'cashboxes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'branchId',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
            isNullable: false,
          },
          {
            name: 'lastAuditedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create cashboxes indexes
    await queryRunner.createIndex(
      'cashboxes',
      new TableIndex({
        name: 'IDX_cashboxes_branchId',
        columnNames: ['branchId'],
        isUnique: true,
      }),
    );

    // Create cashboxes foreign key
    await queryRunner.createForeignKey(
      'cashboxes',
      new TableForeignKey({
        columnNames: ['branchId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'branches',
        onDelete: 'CASCADE',
      }),
    );

    // Create cashboxes check constraint
    await queryRunner.createCheckConstraint(
      'cashboxes',
      new TableCheck({
        name: 'CHK_cashboxes_balance_positive',
        expression: 'balance >= 0',
      }),
    );

    // Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'payerProfileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'receiverId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'receiverType',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'referenceType',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'referenceId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'correlationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'paidAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'createdByProfileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create payments indexes
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_payerProfileId',
        columnNames: ['payerProfileId'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_receiverId_receiverType',
        columnNames: ['receiverId', 'receiverType'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_referenceType_referenceId',
        columnNames: ['referenceType', 'referenceId'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_createdAt',
        columnNames: ['createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_correlationId',
        columnNames: ['correlationId'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_idempotencyKey',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_idempotencyKey_payerProfileId',
        columnNames: ['idempotencyKey', 'payerProfileId'],
      }),
    );

    // Create payments foreign key
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['payerProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'RESTRICT',
      }),
    );

    // Create payments check constraint
    await queryRunner.createCheckConstraint(
      'payments',
      new TableCheck({
        name: 'CHK_payments_amount_positive',
        expression: 'amount > 0',
      }),
    );

    // Create transactions table
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'fromWalletId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'toWalletId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'correlationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create transactions indexes
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_fromWalletId',
        columnNames: ['fromWalletId'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_toWalletId',
        columnNames: ['toWalletId'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_type',
        columnNames: ['type'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_correlationId',
        columnNames: ['correlationId'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_createdAt',
        columnNames: ['createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_correlationId_createdAt',
        columnNames: ['correlationId', 'createdAt'],
      }),
    );

    // Create transactions foreign keys
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['fromWalletId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'wallets',
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['toWalletId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'wallets',
        onDelete: 'RESTRICT',
      }),
    );

    // Create transactions check constraint
    await queryRunner.createCheckConstraint(
      'transactions',
      new TableCheck({
        name: 'CHK_transactions_amount_positive',
        expression: 'amount > 0',
      }),
    );
    await queryRunner.createCheckConstraint(
      'transactions',
      new TableCheck({
        name: 'CHK_transactions_wallet_not_null',
        expression: '("fromWalletId" IS NOT NULL OR "toWalletId" IS NOT NULL)',
      }),
    );

    // Create cash_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'cash_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'branchId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'cashboxId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'direction',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'receivedByProfileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create cash_transactions indexes
    await queryRunner.createIndex(
      'cash_transactions',
      new TableIndex({
        name: 'IDX_cash_transactions_branchId',
        columnNames: ['branchId'],
      }),
    );
    await queryRunner.createIndex(
      'cash_transactions',
      new TableIndex({
        name: 'IDX_cash_transactions_cashboxId',
        columnNames: ['cashboxId'],
      }),
    );
    await queryRunner.createIndex(
      'cash_transactions',
      new TableIndex({
        name: 'IDX_cash_transactions_direction',
        columnNames: ['direction'],
      }),
    );
    await queryRunner.createIndex(
      'cash_transactions',
      new TableIndex({
        name: 'IDX_cash_transactions_type',
        columnNames: ['type'],
      }),
    );
    await queryRunner.createIndex(
      'cash_transactions',
      new TableIndex({
        name: 'IDX_cash_transactions_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Create cash_transactions foreign keys
    await queryRunner.createForeignKey(
      'cash_transactions',
      new TableForeignKey({
        columnNames: ['cashboxId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cashboxes',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'cash_transactions',
      new TableForeignKey({
        columnNames: ['receivedByProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'RESTRICT',
      }),
    );

    // Create cash_transactions check constraint
    await queryRunner.createCheckConstraint(
      'cash_transactions',
      new TableCheck({
        name: 'CHK_cash_transactions_amount_positive',
        expression: 'amount > 0',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.dropTable('cash_transactions', true);
    await queryRunner.dropTable('transactions', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('cashboxes', true);
    await queryRunner.dropTable('wallets', true);
  }
}

