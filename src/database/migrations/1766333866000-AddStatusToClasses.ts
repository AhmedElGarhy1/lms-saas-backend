import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add status column to classes table
 * Default status is PENDING_TEACHER_APPROVAL (new classes require teacher approval)
 */
export class AddStatusToClasses1766333866000 implements MigrationInterface {
  name = 'AddStatusToClasses1766333866000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default value
    await queryRunner.query(`
      ALTER TABLE "classes" 
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_TEACHER_APPROVAL';
    `);

    // Update existing records to have PENDING_TEACHER_APPROVAL status
    await queryRunner.query(`
      UPDATE "classes" 
      SET "status" = 'PENDING_TEACHER_APPROVAL' 
      WHERE "status" IS NULL;
    `);

    // Add index on status field for query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_classes_status" 
      ON "classes" ("status");
    `);

    // Add composite index for filtered queries by center and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_classes_centerId_status" 
      ON "classes" ("centerId", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_classes_centerId_status";
    `);

    // Drop status index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_classes_status";
    `);

    // Remove status column
    await queryRunner.query(`
      ALTER TABLE "classes" 
      DROP COLUMN IF EXISTS "status";
    `);
  }
}

