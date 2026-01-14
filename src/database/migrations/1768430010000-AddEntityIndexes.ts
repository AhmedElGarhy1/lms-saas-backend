import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEntityIndexes1768430010000 implements MigrationInterface {
  name = 'AddEntityIndexes1768430010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables and columns exist before creating indexes
    const tableColumns = await queryRunner.query(`
      SELECT
        t.tablename,
        array_agg(c.column_name) as columns
      FROM pg_tables t
      JOIN information_schema.columns c ON c.table_name = t.tablename
        AND c.table_schema = 'public'
      WHERE t.schemaname = 'public'
        AND t.tablename IN (
          'users', 'payments', 'student_charges', 'teacher_payout_records',
          'classes', 'groups', 'centers', 'branches', 'roles', 'subjects', 'levels'
        )
      GROUP BY t.tablename
    `);

    const tableInfo = tableColumns.reduce((acc: any, row: any) => {
      acc[row.tablename] = row.columns;
      return acc;
    }, {});

    // User entity indexes
    if (tableInfo['users'] && tableInfo['users'].includes('name') && tableInfo['users'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_users_name_created_at"
        ON "users" ("name", "created_at" DESC)
      `);
    }

    if (tableInfo['users'] && tableInfo['users'].includes('is_active') && tableInfo['users'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_users_is_active_created_at"
        ON "users" ("is_active", "created_at" DESC)
      `);
    }

    // Payment entity indexes
    if (tableInfo['payments'] && tableInfo['payments'].includes('amount')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_payments_amount"
        ON "payments" ("amount")
      `);
    }

    // Student charges entity indexes
    if (tableInfo['student_charges'] && tableInfo['student_charges'].includes('amount')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_student_charges_amount"
        ON "student_charges" ("amount")
      `);
    }

    if (tableInfo['student_charges'] && tableInfo['student_charges'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_student_charges_created_at"
        ON "student_charges" ("created_at" DESC)
      `);
    }

    // Teacher payout records entity indexes
    if (tableInfo['teacher_payout_records'] && tableInfo['teacher_payout_records'].includes('unitPrice')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_teacher_payout_records_unitPrice"
        ON "teacher_payout_records" ("unitPrice")
      `);
    }

    if (tableInfo['teacher_payout_records'] && tableInfo['teacher_payout_records'].includes('unitCount')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_teacher_payout_records_unitCount"
        ON "teacher_payout_records" ("unitCount")
      `);
    }

    if (tableInfo['teacher_payout_records'] && tableInfo['teacher_payout_records'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_teacher_payout_records_created_at"
        ON "teacher_payout_records" ("created_at" DESC)
      `);
    }

    // Classes entity indexes
    if (tableInfo['classes'] && tableInfo['classes'].includes('name') && tableInfo['classes'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_classes_name_created_at"
        ON "classes" ("name", "created_at" DESC)
      `);
    }

    // Groups entity indexes
    if (tableInfo['groups'] && tableInfo['groups'].includes('name') && tableInfo['groups'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_groups_name_created_at"
        ON "groups" ("name", "created_at" DESC)
      `);
    }

    // Centers entity indexes
    if (tableInfo['centers'] && tableInfo['centers'].includes('name') && tableInfo['centers'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_centers_name_created_at"
        ON "centers" ("name", "created_at" DESC)
      `);
    }

    // Branches entity indexes
    if (tableInfo['branches'] && tableInfo['branches'].includes('city') && tableInfo['branches'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_branches_city_created_at"
        ON "branches" ("city", "created_at" DESC)
      `);
    }

    // Roles entity indexes
    if (tableInfo['roles'] && tableInfo['roles'].includes('name') && tableInfo['roles'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_roles_name_created_at"
        ON "roles" ("name", "created_at" DESC)
      `);
    }

    // Subjects entity indexes
    if (tableInfo['subjects'] && tableInfo['subjects'].includes('name') && tableInfo['subjects'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_subjects_name_created_at"
        ON "subjects" ("name", "created_at" DESC)
      `);
    }

    // Levels entity indexes
    if (tableInfo['levels'] && tableInfo['levels'].includes('name') && tableInfo['levels'].includes('created_at')) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_levels_name_created_at"
        ON "levels" ("name", "created_at" DESC)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop entity indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_levels_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_subjects_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_roles_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_branches_city_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_centers_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_groups_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_classes_name_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_teacher_payout_records_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_teacher_payout_records_unitCount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_teacher_payout_records_unitPrice"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_charges_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_charges_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_active_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_name_created_at"`);
  }
}