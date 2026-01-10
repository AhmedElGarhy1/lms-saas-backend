import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToClasses1768000445583
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove any duplicate classes (keep the one with the earliest created_at)
    await queryRunner.query(`
            DELETE FROM classes
            WHERE id NOT IN (
                SELECT DISTINCT ON (center_id, branch_id, teacher_user_profile_id, level_id, subject_id) id
                FROM classes
                ORDER BY center_id, branch_id, teacher_user_profile_id, level_id, subject_id, created_at ASC
            )
        `);

    // Add unique constraint to prevent duplicate classes
    // A class is uniquely identified by: center + branch + teacher + level + subject
    await queryRunner.query(`
            ALTER TABLE classes
            ADD CONSTRAINT UQ_classes_center_branch_teacher_level_subject
            UNIQUE (center_id, branch_id, teacher_user_profile_id, level_id, subject_id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint
    await queryRunner.query(`
            ALTER TABLE classes
            DROP CONSTRAINT IF EXISTS UQ_classes_center_branch_teacher_level_subject
        `);
  }
}
