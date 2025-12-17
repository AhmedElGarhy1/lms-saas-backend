import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add joinedAt and leftAt fields to class_staff and group_students tables
 * and remove isActive from class_staff table.
 * This enables timestamp-based membership tracking instead of hard deletes.
 */
export class AddJoinedAtLeftAtToMembershipEntities1765969274000
  implements MigrationInterface
{
  name = 'AddJoinedAtLeftAtToMembershipEntities1765969274000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add joinedAt column to class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ADD COLUMN "joinedAt" TIMESTAMP;
    `);

    // Add leftAt column to class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ADD COLUMN "leftAt" TIMESTAMP;
    `);

    // Add joinedAt column to group_students table
    await queryRunner.query(`
      ALTER TABLE "group_students" 
      ADD COLUMN "joinedAt" TIMESTAMP;
    `);

    // Add leftAt column to group_students table
    await queryRunner.query(`
      ALTER TABLE "group_students" 
      ADD COLUMN "leftAt" TIMESTAMP;
    `);

    // Migrate existing data: set joinedAt = createdAt for all existing records
    await queryRunner.query(`
      UPDATE "class_staff" 
      SET "joinedAt" = "createdAt"
      WHERE "joinedAt" IS NULL;
    `);

    await queryRunner.query(`
      UPDATE "group_students" 
      SET "joinedAt" = "createdAt"
      WHERE "joinedAt" IS NULL;
    `);

    // Set leftAt = NULL for all existing records (they're currently active)
    // This is already the default, but we'll be explicit
    await queryRunner.query(`
      UPDATE "class_staff" 
      SET "leftAt" = NULL
      WHERE "leftAt" IS NULL;
    `);

    await queryRunner.query(`
      UPDATE "group_students" 
      SET "leftAt" = NULL
      WHERE "leftAt" IS NULL;
    `);

    // Set default value for joinedAt columns (for new records)
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;
    `);

    await queryRunner.query(`
      ALTER TABLE "group_students" 
      ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;
    `);

    // Drop isActive column from class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      DROP COLUMN IF EXISTS "isActive";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add isActive column to class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ADD COLUMN "isActive" BOOLEAN DEFAULT true;
    `);

    // Set isActive based on leftAt
    await queryRunner.query(`
      UPDATE "class_staff" 
      SET "isActive" = CASE 
        WHEN "leftAt" IS NULL THEN true 
        ELSE false 
      END;
    `);

    // Drop leftAt and joinedAt columns from group_students table
    await queryRunner.query(`
      ALTER TABLE "group_students" 
      DROP COLUMN IF EXISTS "leftAt";
    `);

    await queryRunner.query(`
      ALTER TABLE "group_students" 
      DROP COLUMN IF EXISTS "joinedAt";
    `);

    // Drop leftAt and joinedAt columns from class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      DROP COLUMN IF EXISTS "leftAt";
    `);

    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      DROP COLUMN IF EXISTS "joinedAt";
    `);
  }
}
