import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to make joinedAt column NOT NULL in class_staff and group_students tables.
 * This ensures all membership records have a join timestamp.
 * All existing records should already have joinedAt populated from the previous migration.
 */
export class MakeJoinedAtNotNullable1766007200000
  implements MigrationInterface
{
  name = 'MakeJoinedAtNotNullable1766007200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure all existing records have joinedAt set (safety check)
    await queryRunner.query(`
      UPDATE "class_staff" 
      SET "joinedAt" = COALESCE("joinedAt", "createdAt", CURRENT_TIMESTAMP)
      WHERE "joinedAt" IS NULL;
    `);

    await queryRunner.query(`
      UPDATE "group_students" 
      SET "joinedAt" = COALESCE("joinedAt", "createdAt", CURRENT_TIMESTAMP)
      WHERE "joinedAt" IS NULL;
    `);

    // Make joinedAt NOT NULL for class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ALTER COLUMN "joinedAt" SET NOT NULL;
    `);

    // Make joinedAt NOT NULL for group_students table
    await queryRunner.query(`
      ALTER TABLE "group_students" 
      ALTER COLUMN "joinedAt" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert joinedAt to nullable for class_staff table
    await queryRunner.query(`
      ALTER TABLE "class_staff" 
      ALTER COLUMN "joinedAt" DROP NOT NULL;
    `);

    // Revert joinedAt to nullable for group_students table
    await queryRunner.query(`
      ALTER TABLE "group_students" 
      ALTER COLUMN "joinedAt" DROP NOT NULL;
    `);
  }
}
