import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeClassGroupNamesRequired20260123144551
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill NULL values in classes.name with timestamp-based names
    await queryRunner.query(`
      UPDATE classes
      SET name = CONCAT('Class-', id::text, '-', EXTRACT(EPOCH FROM "createdAt")::bigint)
      WHERE name IS NULL;
    `);

    // Backfill NULL values in groups.name with timestamp-based names
    await queryRunner.query(`
      UPDATE groups
      SET name = CONCAT('Group-', id::text, '-', EXTRACT(EPOCH FROM "createdAt")::bigint)
      WHERE name IS NULL;
    `);

    // Alter classes.name to be NOT NULL
    await queryRunner.query(`
      ALTER TABLE classes
      ALTER COLUMN name SET NOT NULL;
    `);

    // Alter groups.name to be NOT NULL
    await queryRunner.query(`
      ALTER TABLE groups
      ALTER COLUMN name SET NOT NULL;
    `);

    // Add unique constraint on classes(name, centerId, branchId)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_classes_name_centerId_branchId"
      ON classes(name, "centerId", "branchId")
      WHERE "deletedAt" IS NULL;
    `);

    // Add unique constraint on groups(name, classId)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_groups_name_classId"
      ON groups(name, "classId")
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_groups_name_classId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_classes_name_centerId_branchId";
    `);

    // Make columns nullable again
    await queryRunner.query(`
      ALTER TABLE groups
      ALTER COLUMN name DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE classes
      ALTER COLUMN name DROP NOT NULL;
    `);
  }
}
