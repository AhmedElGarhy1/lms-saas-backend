import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDenormalizedIdsToStudentBillingRecords1767670020000 implements MigrationInterface {
  name = 'AddDenormalizedIdsToStudentBillingRecords1767670020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add denormalized columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "classId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "branchId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ADD COLUMN "centerId" uuid
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_student_billing_records_classId" ON "student_billing_records" ("classId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_billing_records_branchId" ON "student_billing_records" ("branchId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_billing_records_centerId" ON "student_billing_records" ("centerId")
    `);

    // Populate denormalized data from existing records
    await queryRunner.query(`
      UPDATE "student_billing_records"
      SET "classId" = s."classId",
          "branchId" = c."branchId",
          "centerId" = c."centerId"
      FROM "student_payment_strategies" s
      JOIN "classes" c ON s."classId" = c."id"
      WHERE "student_billing_records"."refId" = s."id"
    `);

    // Make columns NOT NULL after populating data
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ALTER COLUMN "classId" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ALTER COLUMN "branchId" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      ALTER COLUMN "centerId" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_student_billing_records_centerId"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_student_billing_records_branchId"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_student_billing_records_classId"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "centerId"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "branchId"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_billing_records"
      DROP COLUMN "classId"
    `);
  }
}
