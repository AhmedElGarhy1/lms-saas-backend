import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyTeacherPayoutStatuses1767564274300
  implements MigrationInterface
{
  name = 'SimplifyTeacherPayoutStatuses1767564274300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Handle existing records with old statuses
    // PROCESSING → PENDING (revert to pending for re-approval)
    // CANCELLED → REJECTED (map to rejected)
    // FAILED → PENDING (allow retry)
    await queryRunner.query(`
      UPDATE "teacher_payout_records"
      SET "status" = CASE
        WHEN "status" = 'PROCESSING' THEN 'PENDING'
        WHEN "status" = 'CANCELLED' THEN 'REJECTED'
        WHEN "status" = 'FAILED' THEN 'PENDING'
        ELSE "status"
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the migration by mapping back to old statuses
    // This is approximate since we can't perfectly reverse the mapping
    await queryRunner.query(`
      UPDATE "teacher_payout_records"
      SET "status" = CASE
        WHEN "status" = 'REJECTED' THEN 'CANCELLED'
        ELSE "status"
      END
    `);
  }
}

