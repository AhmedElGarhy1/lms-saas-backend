import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add exclusion constraint preventing overlapping sessions in the same group
 *
 * This addresses a race condition where high-concurrency environments (two admins saving
 * at the exact same millisecond) can bypass service-level conflict validation.
 *
 * The exclusion constraint ensures the database itself acts as the final gatekeeper for
 * preventing "Double Booking" of sessions within the same group.
 *
 * Uses PostgreSQL exclusion constraint with GiST index to prevent overlapping time ranges:
 * - For the same groupId, no two sessions can have overlapping [startTime, endTime) ranges
 * - Only applies to non-CANCELED sessions (CANCELED sessions are excluded from the constraint)
 */
export class AddSessionOverlapExclusionConstraint1766426712000
  implements MigrationInterface
{
  name = 'AddSessionOverlapExclusionConstraint1766426712000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable btree_gist extension if not already enabled
    // This allows combining UUID (groupId) with range types (time ranges)
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `);

    // Create exclusion constraint to prevent overlapping sessions in the same group
    // The constraint uses:
    // - groupId with = operator (same group)
    // - tsrange(startTime, endTime) with && operator (overlapping ranges)
    // - WHERE clause excludes CANCELED sessions (they can overlap with other sessions)
    //
    // This ensures that for any group, no two non-CANCELED sessions can have
    // overlapping time ranges, even in high-concurrency scenarios.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sessions_groupId_timeRange_exclusion"
      ON "sessions" USING GIST (
        "groupId" WITH =,
        tsrange("startTime", "endTime") WITH &&
      )
      WHERE "status" != 'CANCELED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the exclusion constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_groupId_timeRange_exclusion";
    `);

    // Note: We don't drop btree_gist extension as it might be used by other constraints
    // If you need to drop it, do so manually after ensuring no other dependencies
  }
}
