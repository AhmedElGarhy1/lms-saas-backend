import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassChargesToPaymentStrategies1767545040300
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add includeClass column with default value false
    await queryRunner.query(`
      ALTER TABLE "student_payment_strategies"
      ADD COLUMN "includeClass" boolean NOT NULL DEFAULT false
    `);

    // Add classPrice column (nullable decimal)
    await queryRunner.query(`
      ALTER TABLE "student_payment_strategies"
      ADD COLUMN "classPrice" decimal(10,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove classPrice column
    await queryRunner.query(`
      ALTER TABLE "student_payment_strategies"
      DROP COLUMN "classPrice"
    `);

    // Remove includeClass column
    await queryRunner.query(`
      ALTER TABLE "student_payment_strategies"
      DROP COLUMN "includeClass"
    `);
  }
}
