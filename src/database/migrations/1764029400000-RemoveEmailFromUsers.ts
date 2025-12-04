import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove email and emailVerified columns from users table
 * Email functionality is being removed in favor of phone-only authentication
 */
export class RemoveEmailFromUsers1764029400000 implements MigrationInterface {
  name = 'RemoveEmailFromUsers1764029400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index on email column
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email";
    `);

    // Drop emailVerified column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "emailVerified";
    `);

    // Drop email column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "email";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add email column back
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "email" VARCHAR(255);
    `);

    // Add emailVerified column back
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "emailVerified" TIMESTAMP;
    `);

    // Recreate unique index on email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email"
      ON "users" ("email")
      WHERE "email" IS NOT NULL;
    `);
  }
}
