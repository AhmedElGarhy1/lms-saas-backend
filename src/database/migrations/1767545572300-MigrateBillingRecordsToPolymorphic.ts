import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateBillingRecordsToPolymorphic1767545572300
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new simplified columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "refId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "type" varchar
    `);

    // Migrate existing data - set refId to classId (strategy ID)
    // Keep existing type values (already uppercase)
    await queryRunner.query(`
      UPDATE "student_billing_records"
      SET "refId" = "classId"
    `);

    // Make refId NOT NULL
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ALTER COLUMN "refId" SET NOT NULL
    `);

    // Make type NOT NULL
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ALTER COLUMN "type" SET NOT NULL
    `);

    // Drop old columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "classId"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "sessionId"
    `);

    // Rename old type column to avoid conflicts, then drop it
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      RENAME COLUMN "type" TO "old_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "old_type"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back old columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "classId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "sessionId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "type" varchar
    `);

    // Migrate data back (simplified)
    await queryRunner.query(`
      UPDATE "student_billing_records"
      SET "classId" = "refId",
          "sessionId" = NULL
    `);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "refId"
    `);
  }
}
