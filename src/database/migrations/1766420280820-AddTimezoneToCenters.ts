import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add timezone column to centers table
 * Sets default timezone to 'Africa/Cairo' for all existing centers
 */
export class AddTimezoneToCenters1766420280820 implements MigrationInterface {
  name = 'AddTimezoneToCenters1766420280820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add timezone column with default value
    await queryRunner.query(`
      ALTER TABLE "centers"
      ADD COLUMN "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Cairo';
    `);

    // Update existing centers to have the default timezone (in case any were created before this migration)
    await queryRunner.query(`
      UPDATE "centers"
      SET "timezone" = 'Africa/Cairo'
      WHERE "timezone" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove timezone column
    await queryRunner.query(`
      ALTER TABLE "centers"
      DROP COLUMN IF EXISTS "timezone";
    `);
  }
}
