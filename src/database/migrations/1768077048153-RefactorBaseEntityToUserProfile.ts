import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorBaseEntityToUserProfile1768077048153 implements MigrationInterface {
  name = 'RefactorBaseEntityToUserProfile1768077048153';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all tables that have createdBy, updatedBy, deletedBy columns
    const tables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name IN ('createdBy', 'updatedBy', 'deletedBy')
      AND table_schema = 'public'
      GROUP BY table_name
    `);

    // Rename columns for each table
    for (const table of tables) {
      const tableName = table.table_name;

      // Check if columns exist before renaming
      const hasCreatedBy = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'createdBy' AND table_schema = 'public'
      `, [tableName]);

      const hasUpdatedBy = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'updatedBy' AND table_schema = 'public'
      `, [tableName]);

      const hasDeletedBy = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'deletedBy' AND table_schema = 'public'
      `, [tableName]);

      if (hasCreatedBy.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "createdBy" TO "createdByProfileId"`);
      }

      if (hasUpdatedBy.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "updatedBy" TO "updatedByProfileId"`);
      }

      if (hasDeletedBy.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "deletedBy" TO "deletedByProfileId"`);
      }

      // Drop existing foreign key constraints if they exist
      const constraints = await queryRunner.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = $1::regclass
        AND contype = 'f'
        AND conname LIKE '%createdBy%' OR conname LIKE '%updatedBy%' OR conname LIKE '%deletedBy%'
      `, [tableName]);

      for (const constraint of constraints) {
        await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraint.conname}"`);
      }

      // Add new foreign key constraints to user_profiles
      if (hasCreatedBy.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "FK_${tableName}_createdByProfileId"
          FOREIGN KEY ("createdByProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL
        `);
      }

      if (hasUpdatedBy.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "FK_${tableName}_updatedByProfileId"
          FOREIGN KEY ("updatedByProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL
        `);
      }

      if (hasDeletedBy.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "FK_${tableName}_deletedByProfileId"
          FOREIGN KEY ("deletedByProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all tables that have the new column names
    const tables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name IN ('createdByProfileId', 'updatedByProfileId', 'deletedByProfileId')
      AND table_schema = 'public'
      GROUP BY table_name
    `);

    // Reverse the changes
    for (const table of tables) {
      const tableName = table.table_name;

      // Drop new foreign key constraints
      await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "FK_${tableName}_createdByProfileId"`);
      await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "FK_${tableName}_updatedByProfileId"`);
      await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "FK_${tableName}_deletedByProfileId"`);

      // Rename columns back
      const hasCreatedByProfileId = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'createdByProfileId' AND table_schema = 'public'
      `, [tableName]);

      const hasUpdatedByProfileId = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'updatedByProfileId' AND table_schema = 'public'
      `, [tableName]);

      const hasDeletedByProfileId = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'deletedByProfileId' AND table_schema = 'public'
      `, [tableName]);

      if (hasCreatedByProfileId.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "createdByProfileId" TO "createdBy"`);
      }

      if (hasUpdatedByProfileId.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "updatedByProfileId" TO "updatedBy"`);
      }

      if (hasDeletedByProfileId.length > 0) {
        await queryRunner.query(`ALTER TABLE "${tableName}" RENAME COLUMN "deletedByProfileId" TO "deletedBy"`);
      }

      // Note: Original foreign key constraints to users table are not restored in down migration
      // This is intentional as the down migration is meant to be a safety net, not a perfect reversal
    }
  }
}