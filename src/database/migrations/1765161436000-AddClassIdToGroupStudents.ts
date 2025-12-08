import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add classId to group_students table and enforce unique constraint
 * This ensures a student cannot be in more than one group within the same class
 */
export class AddClassIdToGroupStudents1765161436000
  implements MigrationInterface
{
  name = 'AddClassIdToGroupStudents1765161436000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add classId column to group_students table
    await queryRunner.query(`
      ALTER TABLE group_students 
      ADD COLUMN IF NOT EXISTS "classId" uuid;
    `);

    // Populate classId from groups table for existing records
    await queryRunner.query(`
      UPDATE group_students gs
      SET "classId" = g."classId"
      FROM groups g
      WHERE gs."groupId" = g.id
        AND gs."classId" IS NULL;
    `);

    // Make classId NOT NULL after populating
    await queryRunner.query(`
      ALTER TABLE group_students 
      ALTER COLUMN "classId" SET NOT NULL;
    `);

    // Add index on classId for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_group_students_classId" 
      ON group_students ("classId");
    `);

    // Create unique partial index to prevent multiple group assignments per class
    // Only applies to non-deleted records
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_group_students_one_per_class" 
      ON group_students ("studentUserProfileId", "classId") 
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_group_students_one_per_class";
    `);

    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_group_students_classId";
    `);

    // Remove classId column
    await queryRunner.query(`
      ALTER TABLE group_students 
      DROP COLUMN IF EXISTS "classId";
    `);
  }
}


