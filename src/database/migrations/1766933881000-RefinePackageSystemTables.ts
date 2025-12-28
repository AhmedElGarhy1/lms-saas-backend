import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class RefinePackageSystemTables1766933881000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== RENAME TABLE: session_bookings -> student_session_payments =====
    await queryRunner.query(`ALTER TABLE "session_bookings" RENAME TO "student_session_payments"`);

    // ===== UPDATE COLUMN NAMES =====
    // bookingType -> type
    await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME COLUMN "bookingType" TO "type"`);

    // lockedAmount -> amount (but keep the same logic - 0 for packages, actual amount for wallet/cash)
    await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME COLUMN "lockedAmount" TO "amount"`);

    // ===== ADD NEW COLUMNS =====
    await queryRunner.addColumns('student_session_payments', [
      new TableColumn({
        name: 'transactionId',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'cashTransactionId',
        type: 'uuid',
        isNullable: true,
      }),
    ]);

    // ===== UPDATE ENUM VALUES =====
    // Update status values: PENDING -> LOCKED, ATTENDED -> PAID
    await queryRunner.query(`
      UPDATE "student_session_payments"
      SET "status" = CASE
        WHEN "status" = 'PENDING' THEN 'LOCKED'
        WHEN "status" = 'ATTENDED' THEN 'PAID'
        ELSE "status"
      END
    `);

    // Update type values: WALLET_LOCK -> WALLET
    await queryRunner.query(`
      UPDATE "student_session_payments"
      SET "type" = CASE
        WHEN "type" = 'WALLET_LOCK' THEN 'WALLET'
        ELSE "type"
      END
    `);

    // ===== SIMPLIFY STUDENT_PACKAGES TABLE =====
    // Remove totalSessions and lockedSessions columns as per refined schema
    await queryRunner.dropColumn('student_packages', 'totalSessions');
    await queryRunner.dropColumn('student_packages', 'lockedSessions');

    // ===== UPDATE INDEXES =====
    // Drop old indexes
    await queryRunner.dropIndex('student_session_payments', 'IDX_session_bookings_sessionId_studentProfileId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_session_bookings_status');
    await queryRunner.dropIndex('student_session_payments', 'IDX_session_bookings_studentPackageId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_session_bookings_sessionId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_session_bookings_studentProfileId');

    // Create new indexes with updated names
    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_student_session_payments_studentProfileId',
        columnNames: ['studentProfileId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_student_session_payments_sessionId',
        columnNames: ['sessionId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_student_session_payments_studentPackageId',
        columnNames: ['studentPackageId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_student_session_payments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_student_session_payments_sessionId_studentProfileId',
        columnNames: ['sessionId', 'studentProfileId'],
        isUnique: true,
      }),
    );

    // ===== UPDATE FOREIGN KEY CONSTRAINTS =====
    // Drop old foreign keys
    await queryRunner.dropForeignKey('student_session_payments', 'FK_booking_package');
    await queryRunner.dropForeignKey('student_session_payments', 'FK_booking_session');
    await queryRunner.dropForeignKey('student_session_payments', 'FK_booking_student');

    // Create new foreign keys with updated names
    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['studentProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
        name: 'FK_session_pay_student',
      }),
    );

    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sessions',
        onDelete: 'CASCADE',
        name: 'FK_session_pay_session',
      }),
    );

    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['studentPackageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'student_packages',
        onDelete: 'SET NULL',
        name: 'FK_session_pay_package',
      }),
    );

    // ===== UPDATE CHECK CONSTRAINTS =====
    // Remove the old constraint that referenced totalSessions and lockedSessions
    await queryRunner.query(`ALTER TABLE "student_packages" DROP CONSTRAINT IF EXISTS "CHK_student_packages_sessions_consistency";`);
    await queryRunner.query(`ALTER TABLE "student_packages" DROP CONSTRAINT IF EXISTS "CHK_student_packages_locked_sessions_non_negative";`);

    // Add constraint for remainingSessions >= 0
    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_remaining_sessions_non_negative"
      CHECK ("remainingSessions" >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== REVERSE SIMPLIFICATION =====
    // Add back totalSessions and lockedSessions columns
    await queryRunner.addColumns('student_packages', [
      new TableColumn({
        name: 'totalSessions',
        type: 'int4',
        default: 0,
      }),
      new TableColumn({
        name: 'lockedSessions',
        type: 'int4',
        default: 0,
      }),
    ]);

    // Populate totalSessions with remainingSessions (best guess)
    await queryRunner.query(`
      UPDATE "student_packages"
      SET "totalSessions" = "remainingSessions", "lockedSessions" = 0
    `);

    // ===== DROP NEW COLUMNS =====
    await queryRunner.dropColumn('student_session_payments', 'cashTransactionId');
    await queryRunner.dropColumn('student_session_payments', 'transactionId');

    // ===== REVERT ENUM VALUES =====
    await queryRunner.query(`
      UPDATE "student_session_payments"
      SET "status" = CASE
        WHEN "status" = 'LOCKED' THEN 'PENDING'
        WHEN "status" = 'PAID' THEN 'ATTENDED'
        ELSE "status"
      END
    `);

    await queryRunner.query(`
      UPDATE "student_session_payments"
      SET "type" = CASE
        WHEN "type" = 'WALLET' THEN 'WALLET_LOCK'
        ELSE "type"
      END
    `);

    // ===== REVERT COLUMN NAMES =====
    await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME COLUMN "amount" TO "lockedAmount"`);
    await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME COLUMN "type" TO "bookingType"`);

    // ===== REVERT INDEXES =====
    await queryRunner.dropIndex('student_session_payments', 'IDX_student_session_payments_sessionId_studentProfileId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_student_session_payments_status');
    await queryRunner.dropIndex('student_session_payments', 'IDX_student_session_payments_studentPackageId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_student_session_payments_sessionId');
    await queryRunner.dropIndex('student_session_payments', 'IDX_student_session_payments_studentProfileId');

    // Recreate old indexes
    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_session_bookings_studentProfileId',
        columnNames: ['studentProfileId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_session_bookings_sessionId',
        columnNames: ['sessionId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_session_bookings_studentPackageId',
        columnNames: ['studentPackageId'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_session_bookings_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'student_session_payments',
      new TableIndex({
        name: 'IDX_session_bookings_sessionId_studentProfileId',
        columnNames: ['sessionId', 'studentProfileId'],
        isUnique: true,
      }),
    );

    // ===== REVERT FOREIGN KEYS =====
    await queryRunner.dropForeignKey('student_session_payments', 'FK_session_pay_package');
    await queryRunner.dropForeignKey('student_session_payments', 'FK_session_pay_session');
    await queryRunner.dropForeignKey('student_session_payments', 'FK_session_pay_student');

    // Recreate old foreign keys
    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['studentProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
        name: 'FK_booking_student',
      }),
    );

    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sessions',
        onDelete: 'CASCADE',
        name: 'FK_booking_session',
      }),
    );

    await queryRunner.createForeignKey(
      'student_session_payments',
      new TableForeignKey({
        columnNames: ['studentPackageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'student_packages',
        onDelete: 'SET NULL',
        name: 'FK_booking_package',
      }),
    );

    // ===== RENAME TABLE BACK =====
    await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME TO "session_bookings"`);

    // ===== RESTORE CHECK CONSTRAINTS =====
    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_sessions_consistency"
      CHECK (("remainingSessions" + "lockedSessions") <= "totalSessions");
    `);

    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_locked_sessions_non_negative"
      CHECK ("lockedSessions" >= 0);
    `);
  }
}
