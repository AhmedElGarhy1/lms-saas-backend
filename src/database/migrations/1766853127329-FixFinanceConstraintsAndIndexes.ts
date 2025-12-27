import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixFinanceConstraintsAndIndexes1766853127329 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== FIX DANGEROUS DELETE CONSTRAINTS =====

    // Change group_students foreign key constraints from CASCADE to RESTRICT
    // This prevents accidental deletion of enrollment history when centers/groups are deleted

    // Drop existing CASCADE foreign keys for group_students
    await queryRunner.dropForeignKey('group_students', 'FK_group_students_groupId');
    await queryRunner.dropForeignKey('group_students', 'FK_group_students_studentUserProfileId');

    // Create new RESTRICT foreign keys for group_students
    await queryRunner.createForeignKey(
      'group_students',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'RESTRICT', // Prevent deletion if enrollments exist
        name: 'FK_group_students_groupId_RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'group_students',
      new TableForeignKey({
        columnNames: ['studentUserProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'RESTRICT', // Prevent deletion if enrollments exist
        name: 'FK_group_students_studentUserProfileId_RESTRICT',
      }),
    );

    // ===== ADD MISSING PERFORMANCE INDEXES =====

    // Add composite index for group_students(studentUserProfileId, groupId) for enrollment checks
    // This is mentioned as missing in the user's feedback
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_group_students_studentUserProfileId_groupId"
      ON "group_students" ("studentUserProfileId", "groupId");
    `);

    // Add composite index for sessions(startTime, centerId) for calendar views
    // This is mentioned as missing in the user's feedback
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_sessions_startTime_centerId"
      ON "sessions" ("startTime", "centerId");
    `);

    // ===== WALLET CURRENCY SAFETY =====

    // Add check constraint to ensure wallet balances are properly rounded to 2 decimal places
    // This provides database-level validation for currency precision
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD CONSTRAINT "CHK_wallets_balance_precision"
      CHECK (
        "balance" = ROUND("balance", 2) AND
        "bonusBalance" = ROUND("bonusBalance", 2) AND
        "lockedBalance" = ROUND("lockedBalance", 2)
      );
    `);

    // ===== AUDIT ENHANCEMENTS =====

    // Ensure activity_logs has proper indexes for finance audit queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_activity_logs_type_createdAt"
      ON "activity_logs" ("type", "createdAt");
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_activity_logs_targetUserId_type_createdAt"
      ON "activity_logs" ("targetUserId", "type", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== REVERT AUDIT ENHANCEMENTS =====
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_targetUserId_type_createdAt";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_type_createdAt";`);

    // ===== REVERT WALLET CURRENCY SAFETY =====
    await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "CHK_wallets_balance_precision";`);

    // ===== REVERT MISSING PERFORMANCE INDEXES =====
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_startTime_centerId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_students_studentUserProfileId_groupId";`);

    // ===== REVERT DELETE CONSTRAINTS =====

    // Drop RESTRICT foreign keys
    await queryRunner.dropForeignKey('group_students', 'FK_group_students_groupId_RESTRICT');
    await queryRunner.dropForeignKey('group_students', 'FK_group_students_studentUserProfileId_RESTRICT');

    // Restore original CASCADE foreign keys
    await queryRunner.createForeignKey(
      'group_students',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
        name: 'FK_group_students_groupId',
      }),
    );

    await queryRunner.createForeignKey(
      'group_students',
      new TableForeignKey({
        columnNames: ['studentUserProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
        name: 'FK_group_students_studentUserProfileId',
      }),
    );
  }
}
