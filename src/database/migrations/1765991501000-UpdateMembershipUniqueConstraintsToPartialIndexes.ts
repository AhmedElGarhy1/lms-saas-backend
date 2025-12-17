import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to replace unique constraints with partial unique indexes
 * for group_students and class_staff tables.
 * This allows multiple records (for history) but ensures only one active record
 * (where leftAt IS NULL) per unique combination.
 */
export class UpdateMembershipUniqueConstraintsToPartialIndexes1765991501000
  implements MigrationInterface
{
  name = 'UpdateMembershipUniqueConstraintsToPartialIndexes1765991501000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop all unique constraints on group_students table
    // This handles both @Unique decorator constraints and @Index unique constraints
    const groupStudentConstraints = await queryRunner.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'group_students'::regclass 
        AND contype = 'u';
    `);

    for (const constraint of groupStudentConstraints) {
      await queryRunner.query(`
        ALTER TABLE "group_students" DROP CONSTRAINT IF EXISTS "${constraint.conname}" CASCADE;
      `);
    }

    // Drop unique indexes that might exist
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_group_students_classId_studentUserProfileId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_group_students_groupId_studentUserProfileId";
    `);

    // Create partial unique index for group_students (groupId, studentUserProfileId)
    // Only applies when leftAt IS NULL (active membership)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_group_students_active_groupId_studentUserProfileId"
      ON "group_students" ("groupId", "studentUserProfileId")
      WHERE "leftAt" IS NULL;
    `);

    // Create partial unique index for group_students (classId, studentUserProfileId)
    // Only applies when leftAt IS NULL (active membership)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_group_students_active_classId_studentUserProfileId"
      ON "group_students" ("classId", "studentUserProfileId")
      WHERE "leftAt" IS NULL;
    `);

    // Drop all unique constraints on class_staff table
    const classStaffConstraints = await queryRunner.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'class_staff'::regclass 
        AND contype = 'u';
    `);

    for (const constraint of classStaffConstraints) {
      await queryRunner.query(`
        ALTER TABLE "class_staff" DROP CONSTRAINT IF EXISTS "${constraint.conname}" CASCADE;
      `);
    }

    // Drop unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_class_staff_userProfileId_classId";
    `);

    // Create partial unique index for class_staff (userProfileId, classId)
    // Only applies when leftAt IS NULL (active membership)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_class_staff_active_userProfileId_classId"
      ON "class_staff" ("userProfileId", "classId")
      WHERE "leftAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partial unique indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_group_students_active_groupId_studentUserProfileId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_group_students_active_classId_studentUserProfileId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_class_staff_active_userProfileId_classId";
    `);

    // Recreate original unique constraints/indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_group_students_groupId_studentUserProfileId"
      ON "group_students" ("groupId", "studentUserProfileId");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_group_students_classId_studentUserProfileId"
      ON "group_students" ("classId", "studentUserProfileId");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_class_staff_userProfileId_classId"
      ON "class_staff" ("userProfileId", "classId");
    `);
  }
}
