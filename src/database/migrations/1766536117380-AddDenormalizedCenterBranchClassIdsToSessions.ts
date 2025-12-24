import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add denormalized centerId, branchId, and classId fields to sessions table.
 *
 * These fields act as snapshots to improve query performance and maintain
 * historical data integrity when groups/classes move between branches.
 */
export class AddDenormalizedCenterBranchClassIdsToSessions1766536117380
  implements MigrationInterface
{
  name = 'AddDenormalizedCenterBranchClassIdsToSessions1766536117380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add centerId, branchId, and classId columns to sessions table
    await queryRunner.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS "centerId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS "branchId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS "classId" uuid;
    `);

    // Backfill centerId, branchId, and classId from groups table
    await queryRunner.query(`
      UPDATE sessions s
      SET "centerId" = g."centerId",
          "branchId" = g."branchId",
          "classId" = g."classId"
      FROM groups g
      WHERE s."groupId" = g.id
        AND (s."centerId" IS NULL OR s."branchId" IS NULL OR s."classId" IS NULL);
    `);

    // Verify no NULL values before making NOT NULL
    const sessionsNullCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE "centerId" IS NULL OR "branchId" IS NULL OR "classId" IS NULL;
    `);

    if (parseInt(sessionsNullCount[0].count) > 0) {
      throw new Error(
        `Migration failed: Found ${sessionsNullCount[0].count} sessions records with NULL centerId, branchId, or classId`,
      );
    }

    // Make centerId, branchId, and classId NOT NULL
    await queryRunner.query(`
      ALTER TABLE sessions 
      ALTER COLUMN "centerId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      ALTER COLUMN "branchId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      ALTER COLUMN "classId" SET NOT NULL;
    `);

    // Add indexes for sessions
    // Primary composite index for most common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_centerId_branchId" 
      ON sessions ("centerId", "branchId");
    `);

    // Composite index for class-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_centerId_classId" 
      ON sessions ("centerId", "classId");
    `);

    // Comprehensive composite index for complex filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_centerId_branchId_classId" 
      ON sessions ("centerId", "branchId", "classId");
    `);

    // Separate index for center-only queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_centerId" 
      ON sessions ("centerId");
    `);

    // Separate index for class-only queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_classId" 
      ON sessions ("classId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for sessions
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_classId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_centerId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_centerId_branchId_classId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_centerId_classId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_centerId_branchId";
    `);

    // Remove columns from sessions
    await queryRunner.query(`
      ALTER TABLE sessions 
      DROP COLUMN IF EXISTS "classId";
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      DROP COLUMN IF EXISTS "branchId";
    `);

    await queryRunner.query(`
      ALTER TABLE sessions 
      DROP COLUMN IF EXISTS "centerId";
    `);
  }
}

