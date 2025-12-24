import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add denormalized centerId and branchId fields to:
 * - class_staff: Add branchId
 * - group_students: Add centerId and branchId
 * - student_payment_strategies: Add centerId and branchId
 * - teacher_payment_strategies: Add centerId and branchId
 *
 * These fields act as snapshots to improve query performance and maintain
 * historical data integrity when classes/groups move between branches.
 */
export class AddDenormalizedCenterBranchIds1766535785778
  implements MigrationInterface
{
  name = 'AddDenormalizedCenterBranchIds1766535785778';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add branchId to class_staff
    await queryRunner.query(`
      ALTER TABLE class_staff 
      ADD COLUMN IF NOT EXISTS "branchId" uuid;
    `);

    // Backfill branchId from classes table
    await queryRunner.query(`
      UPDATE class_staff cs
      SET "branchId" = c."branchId"
      FROM classes c
      WHERE cs."classId" = c.id
        AND cs."branchId" IS NULL;
    `);

    // Verify no NULL values before making NOT NULL
    const classStaffNullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM class_staff
      WHERE "branchId" IS NULL;
    `);

    if (parseInt(classStaffNullCount[0].count) > 0) {
      throw new Error(
        `Migration failed: Found ${classStaffNullCount[0].count} class_staff records with NULL branchId`,
      );
    }

    // Make branchId NOT NULL
    await queryRunner.query(`
      ALTER TABLE class_staff 
      ALTER COLUMN "branchId" SET NOT NULL;
    `);

    // Add indexes for class_staff
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_class_staff_centerId_branchId" 
      ON class_staff ("centerId", "branchId");
    `);

    // 2. Add centerId and branchId to group_students
    await queryRunner.query(`
      ALTER TABLE group_students 
      ADD COLUMN IF NOT EXISTS "centerId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE group_students 
      ADD COLUMN IF NOT EXISTS "branchId" uuid;
    `);

    // Backfill centerId and branchId from groups table
    await queryRunner.query(`
      UPDATE group_students gs
      SET "centerId" = g."centerId",
          "branchId" = g."branchId"
      FROM groups g
      WHERE gs."groupId" = g.id
        AND (gs."centerId" IS NULL OR gs."branchId" IS NULL);
    `);

    // Verify no NULL values before making NOT NULL
    const groupStudentsNullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM group_students
      WHERE "centerId" IS NULL OR "branchId" IS NULL;
    `);

    if (parseInt(groupStudentsNullCount[0].count) > 0) {
      throw new Error(
        `Migration failed: Found ${groupStudentsNullCount[0].count} group_students records with NULL centerId or branchId`,
      );
    }

    // Make centerId and branchId NOT NULL
    await queryRunner.query(`
      ALTER TABLE group_students 
      ALTER COLUMN "centerId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE group_students 
      ALTER COLUMN "branchId" SET NOT NULL;
    `);

    // Add indexes for group_students
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_group_students_centerId_branchId" 
      ON group_students ("centerId", "branchId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_group_students_centerId" 
      ON group_students ("centerId");
    `);

    // 3. Add centerId and branchId to student_payment_strategies
    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      ADD COLUMN IF NOT EXISTS "centerId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      ADD COLUMN IF NOT EXISTS "branchId" uuid;
    `);

    // Backfill centerId and branchId from classes table
    await queryRunner.query(`
      UPDATE student_payment_strategies sps
      SET "centerId" = c."centerId",
          "branchId" = c."branchId"
      FROM classes c
      WHERE sps."classId" = c.id
        AND (sps."centerId" IS NULL OR sps."branchId" IS NULL);
    `);

    // Verify no NULL values before making NOT NULL
    const studentStrategyNullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM student_payment_strategies
      WHERE "centerId" IS NULL OR "branchId" IS NULL;
    `);

    if (parseInt(studentStrategyNullCount[0].count) > 0) {
      throw new Error(
        `Migration failed: Found ${studentStrategyNullCount[0].count} student_payment_strategies records with NULL centerId or branchId`,
      );
    }

    // Make centerId and branchId NOT NULL
    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      ALTER COLUMN "centerId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      ALTER COLUMN "branchId" SET NOT NULL;
    `);

    // Add indexes for student_payment_strategies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_student_payment_strategies_centerId_branchId" 
      ON student_payment_strategies ("centerId", "branchId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_student_payment_strategies_centerId" 
      ON student_payment_strategies ("centerId");
    `);

    // 4. Add centerId and branchId to teacher_payment_strategies
    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      ADD COLUMN IF NOT EXISTS "centerId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      ADD COLUMN IF NOT EXISTS "branchId" uuid;
    `);

    // Backfill centerId and branchId from classes table
    await queryRunner.query(`
      UPDATE teacher_payment_strategies tps
      SET "centerId" = c."centerId",
          "branchId" = c."branchId"
      FROM classes c
      WHERE tps."classId" = c.id
        AND (tps."centerId" IS NULL OR tps."branchId" IS NULL);
    `);

    // Verify no NULL values before making NOT NULL
    const teacherStrategyNullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM teacher_payment_strategies
      WHERE "centerId" IS NULL OR "branchId" IS NULL;
    `);

    if (parseInt(teacherStrategyNullCount[0].count) > 0) {
      throw new Error(
        `Migration failed: Found ${teacherStrategyNullCount[0].count} teacher_payment_strategies records with NULL centerId or branchId`,
      );
    }

    // Make centerId and branchId NOT NULL
    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      ALTER COLUMN "centerId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      ALTER COLUMN "branchId" SET NOT NULL;
    `);

    // Add indexes for teacher_payment_strategies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_teacher_payment_strategies_centerId_branchId" 
      ON teacher_payment_strategies ("centerId", "branchId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_teacher_payment_strategies_centerId" 
      ON teacher_payment_strategies ("centerId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for teacher_payment_strategies
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_teacher_payment_strategies_centerId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_teacher_payment_strategies_centerId_branchId";
    `);

    // Remove columns from teacher_payment_strategies
    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      DROP COLUMN IF EXISTS "branchId";
    `);

    await queryRunner.query(`
      ALTER TABLE teacher_payment_strategies 
      DROP COLUMN IF EXISTS "centerId";
    `);

    // Drop indexes for student_payment_strategies
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_student_payment_strategies_centerId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_student_payment_strategies_centerId_branchId";
    `);

    // Remove columns from student_payment_strategies
    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      DROP COLUMN IF EXISTS "branchId";
    `);

    await queryRunner.query(`
      ALTER TABLE student_payment_strategies 
      DROP COLUMN IF EXISTS "centerId";
    `);

    // Drop indexes for group_students
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_group_students_centerId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_group_students_centerId_branchId";
    `);

    // Remove columns from group_students
    await queryRunner.query(`
      ALTER TABLE group_students 
      DROP COLUMN IF EXISTS "branchId";
    `);

    await queryRunner.query(`
      ALTER TABLE group_students 
      DROP COLUMN IF EXISTS "centerId";
    `);

    // Drop index for class_staff
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_class_staff_centerId_branchId";
    `);

    // Remove column from class_staff
    await queryRunner.query(`
      ALTER TABLE class_staff 
      DROP COLUMN IF EXISTS "branchId";
    `);
  }
}

