import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTypeToPayments1767670000000 implements MigrationInterface {
  name = 'AddPaymentTypeToPayments1767670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "type" varchar(20) NOT NULL DEFAULT 'INTERNAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN "type"
    `);
  }
}
