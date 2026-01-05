import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentIdToTransactions1767565000000 implements MigrationInterface {
  name = 'AddPaymentIdToTransactions1767565000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add paymentId to transactions table (required)
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "paymentId" uuid NOT NULL
    `);

    // Add paymentId to cash_transactions table (required)
    await queryRunner.query(`
      ALTER TABLE "cash_transactions"
      ADD COLUMN "paymentId" uuid NOT NULL
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_payment_id" ON "transactions" ("paymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cash_transactions_payment_id" ON "cash_transactions" ("paymentId")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "fk_transactions_payment_id"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "cash_transactions"
      ADD CONSTRAINT "fk_cash_transactions_payment_id"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE
    `);

    // Migrate existing data using correlationId
    // For transactions created by payments
    await queryRunner.query(`
      UPDATE transactions
      SET "paymentId" = payments.id
      FROM payments
      WHERE transactions."correlationId" = payments."correlationId"
      AND transactions."paymentId" IS NULL
    `);

    // For cash transactions created by payments
    await queryRunner.query(`
      UPDATE cash_transactions
      SET "paymentId" = payments.id
      FROM payments
      WHERE cash_transactions."correlationId" = payments."correlationId"
      AND cash_transactions."paymentId" IS NULL
    `);

    // For any remaining transactions without paymentId, create dummy payments
    // This handles transactions created outside the payment flow
    await queryRunner.query(`
      INSERT INTO payments (
        id, amount, "senderId", "senderType", "receiverId", "receiverType",
        status, reason, source, "correlationId", "paidAt", "createdByProfileId", "createdAt", "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        t.amount,
        CASE WHEN t."fromWalletId" IS NOT NULL THEN t."fromWalletId" ELSE 'system' END,
        CASE WHEN t."fromWalletId" IS NOT NULL THEN 'USER_PROFILE' ELSE 'SYSTEM' END,
        CASE WHEN t."toWalletId" IS NOT NULL THEN t."toWalletId" ELSE 'system' END,
        CASE WHEN t."toWalletId" IS NOT NULL THEN 'USER_PROFILE' ELSE 'SYSTEM' END,
        'COMPLETED',
        'INTERNAL_TRANSFER',
        'WALLET',
        t."correlationId",
        t."createdAt",
        'system-user-id',
        t."createdAt",
        t."updatedAt"
      FROM transactions t
      WHERE t."paymentId" IS NULL
    `);

    // Update the newly created payments' IDs in transactions
    await queryRunner.query(`
      UPDATE transactions
      SET "paymentId" = payments.id
      FROM payments
      WHERE transactions."correlationId" = payments."correlationId"
      AND transactions."paymentId" IS NULL
      AND payments.reason = 'INTERNAL_TRANSFER'
    `);

    // Handle any remaining transactions (create individual payments)
    await queryRunner.query(`
      UPDATE transactions
      SET "paymentId" = gen_random_uuid()
      WHERE "paymentId" IS NULL
    `);

    // Insert corresponding payment records for remaining transactions
    await queryRunner.query(`
      INSERT INTO payments (
        id, amount, "senderId", "senderType", "receiverId", "receiverType",
        status, reason, source, "correlationId", "paidAt", "createdByProfileId", "createdAt", "updatedAt"
      )
      SELECT
        t."paymentId",
        t.amount,
        CASE WHEN t."fromWalletId" IS NOT NULL THEN t."fromWalletId" ELSE 'system' END,
        CASE WHEN t."fromWalletId" IS NOT NULL THEN 'USER_PROFILE' ELSE 'SYSTEM' END,
        CASE WHEN t."toWalletId" IS NOT NULL THEN t."toWalletId" ELSE 'system' END,
        CASE WHEN t."toWalletId" IS NOT NULL THEN 'USER_PROFILE' ELSE 'SYSTEM' END,
        'COMPLETED',
        'INTERNAL_TRANSFER',
        'WALLET',
        t."correlationId",
        t."createdAt",
        'system-user-id',
        t."createdAt",
        t."updatedAt"
      FROM transactions t
      WHERE t.id IN (
        SELECT id FROM transactions WHERE "paymentId" IS NOT NULL
        EXCEPT
        SELECT id FROM transactions WHERE "paymentId" IN (SELECT id FROM payments)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE "cash_transactions" DROP CONSTRAINT "fk_cash_transactions_payment_id"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "fk_transactions_payment_id"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "idx_cash_transactions_payment_id"`);
    await queryRunner.query(`DROP INDEX "idx_transactions_payment_id"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "cash_transactions" DROP COLUMN "paymentId"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "paymentId"`);
  }
}
