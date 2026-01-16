import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCorrelationIdToPayments1768430020000 implements MigrationInterface {
  name = 'AddCorrelationIdToPayments1768430020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add correlationId column to payments table
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "correlation_id" uuid NULL
    `);

    // Add index for correlation_id for performance (used in teacher payout queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_correlation_id"
      ON "payments" ("correlation_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_correlation_id"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "correlation_id"`);
  }
}