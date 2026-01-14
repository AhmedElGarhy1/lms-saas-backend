import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaginationIndexes1768430000000 implements MigrationInterface {
  name = 'AddPaginationIndexes1768430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables exist and have required columns before creating indexes
    const tableColumns = await queryRunner.query(`
      SELECT
        t.tablename,
        array_agg(c.column_name) as columns
      FROM pg_tables t
      JOIN information_schema.columns c ON c.table_name = t.tablename
        AND c.table_schema = 'public'
      WHERE t.schemaname = 'public'
        AND t.tablename IN (
          'users', 'sessions', 'payments', 'transactions',
          'student_charges', 'classes', 'groups', 'centers',
          'branches', 'teacher_payout_records', 'activity_logs', 'roles'
        )
      GROUP BY t.tablename
    `);

    const tableInfo = tableColumns.reduce((acc: any, row: any) => {
      acc[row.tablename] = row.columns;
      return acc;
    }, {});

    // User Management Indexes - High Impact
    if (tableInfo['users'] && tableInfo['users'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_users_name_created_at"
        ON "users" ("name", "created_at" DESC)
      `);

      if (tableInfo['users'].includes('is_active')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_users_is_active_created_at"
          ON "users" ("is_active", "created_at" DESC)
        `);
      }
    }

    // Sessions Indexes - High Impact
    if (tableInfo['sessions'] && tableInfo['sessions'].includes('start_time')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_sessions_start_time"
        ON "sessions" ("start_time" DESC)
      `);

      if (tableInfo['sessions'].includes('end_time')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_sessions_end_time"
          ON "sessions" ("end_time" DESC)
        `);
      }

      if (tableInfo['sessions'].includes('status')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_sessions_status_start_time"
          ON "sessions" ("status", "start_time" DESC)
        `);
      }
    }

    // Finance Indexes - High Impact
    if (tableInfo['payments'] && tableInfo['payments'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_payments_created_at"
        ON "payments" ("created_at" DESC)
      `);

      if (tableInfo['payments'].includes('amount')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_payments_amount"
          ON "payments" ("amount")
        `);
      }
    }

    if (
      tableInfo['transactions'] &&
      tableInfo['transactions'].includes('created_at')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_transactions_created_at"
        ON "transactions" ("created_at" DESC)
      `);
    }

    // Student Billing Indexes - Medium Impact
    if (
      tableInfo['student_charges'] &&
      tableInfo['student_charges'].includes('created_at')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_student_charges_created_at"
        ON "student_charges" ("created_at" DESC)
      `);

      if (tableInfo['student_charges'].includes('amount')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_student_charges_amount"
          ON "student_charges" ("amount")
        `);
      }
    }

    // Classes & Groups Indexes - Medium Impact
    if (
      tableInfo['classes'] &&
      tableInfo['classes'].includes('created_at') &&
      tableInfo['classes'].includes('name')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_classes_name_created_at"
        ON "classes" ("name", "created_at" DESC)
      `);
    }

    if (
      tableInfo['groups'] &&
      tableInfo['groups'].includes('created_at') &&
      tableInfo['groups'].includes('name')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_groups_name_created_at"
        ON "groups" ("name", "created_at" DESC)
      `);
    }

    // Centers & Branches Indexes - Medium Impact
    if (
      tableInfo['centers'] &&
      tableInfo['centers'].includes('created_at') &&
      tableInfo['centers'].includes('name')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_centers_name_created_at"
        ON "centers" ("name", "created_at" DESC)
      `);
    }

    if (
      tableInfo['branches'] &&
      tableInfo['branches'].includes('created_at') &&
      tableInfo['branches'].includes('name')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_branches_name_created_at"
        ON "branches" ("name", "created_at" DESC)
      `);
    }

    // Teacher Payouts Indexes - Medium Impact
    if (
      tableInfo['teacher_payout_records'] &&
      tableInfo['teacher_payout_records'].includes('created_at')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_teacher_payouts_created_at"
        ON "teacher_payout_records" ("created_at" DESC)
      `);

      if (tableInfo['teacher_payout_records'].includes('amount')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_teacher_payouts_amount"
          ON "teacher_payout_records" ("amount")
        `);
      }
    }

    // Activity Logs Indexes - Low Impact
    if (
      tableInfo['activity_logs'] &&
      tableInfo['activity_logs'].includes('created_at') &&
      tableInfo['activity_logs'].includes('action')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at_action"
        ON "activity_logs" ("created_at" DESC, "action")
      `);
    }

    // Roles Indexes - Low Impact
    if (
      tableInfo['roles'] &&
      tableInfo['roles'].includes('created_at') &&
      tableInfo['roles'].includes('name')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_roles_name_created_at"
        ON "roles" ("name", "created_at" DESC)
      `);
    }

    // Attendance Indexes - Medium Impact
    if (
      tableInfo['attendance'] &&
      tableInfo['attendance'].includes('created_at')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_created_at"
        ON "attendance" ("created_at" DESC)
      `);

      if (tableInfo['attendance'].includes('status')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_attendance_status_created_at"
          ON "attendance" ("status", "created_at" DESC)
        `);
      }
    }

    // Notification Indexes - Medium Impact
    if (
      tableInfo['notification_logs'] &&
      tableInfo['notification_logs'].includes('created_at')
    ) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_notification_logs_created_at"
        ON "notification_logs" ("created_at" DESC)
      `);

      if (tableInfo['notification_logs'].includes('status')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_notification_logs_status_created_at"
          ON "notification_logs" ("status", "created_at" DESC)
        `);
      }

      if (tableInfo['notification_logs'].includes('channel')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_notification_logs_channel_created_at"
          ON "notification_logs" ("channel", "created_at" DESC)
        `);
      }

      if (tableInfo['notification_logs'].includes('type')) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "idx_notification_logs_type_created_at"
          ON "notification_logs" ("type", "created_at" DESC)
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_logs_type_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_logs_channel_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_logs_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_logs_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_attendance_status_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attendance_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_roles_name_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_activity_logs_created_at_action"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_teacher_payouts_amount"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_teacher_payouts_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_branches_name_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_centers_name_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_groups_name_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_classes_name_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_student_charges_amount"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_student_charges_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transactions_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_sessions_status_start_time"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_end_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_start_time"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_users_is_active_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_name_created_at"`);
  }
}
