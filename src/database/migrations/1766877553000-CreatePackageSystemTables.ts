import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePackageSystemTables1766877553000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== CREATE CLASS_PACKAGES TABLE =====
    // The Package Template (What the center sells)
    await queryRunner.createTable(
      new Table({
        name: 'class_packages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'groupId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'sessionCount',
            type: 'int4',
          },
          {
            name: 'price',
            type: 'numeric',
            precision: 12,
            scale: 2,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
        ],
      }),
    );

    // ===== CREATE STUDENT_PACKAGES TABLE =====
    // The Student's "Inventory" (What they own)
    await queryRunner.createTable(
      new Table({
        name: 'student_packages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'studentProfileId',
            type: 'uuid',
          },
          {
            name: 'packageId',
            type: 'uuid',
          },
          {
            name: 'totalSessions',
            type: 'int4',
          },
          {
            name: 'remainingSessions',
            type: 'int4',
          },
          {
            name: 'lockedSessions',
            type: 'int4',
            default: 0,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'ACTIVE'",
          },
        ],
      }),
    );

    // ===== CREATE SESSION_BOOKINGS TABLE =====
    // The Booking (The specific appointment)
    await queryRunner.createTable(
      new Table({
        name: 'session_bookings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'studentProfileId',
            type: 'uuid',
          },
          {
            name: 'sessionId',
            type: 'uuid',
          },
          {
            name: 'bookingType',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'studentPackageId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          {
            name: 'lockedAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
        ],
      }),
    );

    // ===== CREATE FOREIGN KEY CONSTRAINTS =====

    // class_packages -> groups
    await queryRunner.createForeignKey(
      'class_packages',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
        name: 'FK_class_packages_group',
      }),
    );

    // student_packages -> user_profiles
    await queryRunner.createForeignKey(
      'student_packages',
      new TableForeignKey({
        columnNames: ['studentProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
        name: 'FK_student_packages_profile',
      }),
    );

    // student_packages -> class_packages
    await queryRunner.createForeignKey(
      'student_packages',
      new TableForeignKey({
        columnNames: ['packageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'class_packages',
        onDelete: 'CASCADE',
        name: 'FK_student_packages_template',
      }),
    );

    // session_bookings -> user_profiles
    await queryRunner.createForeignKey(
      'session_bookings',
      new TableForeignKey({
        columnNames: ['studentProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
        name: 'FK_booking_student',
      }),
    );

    // session_bookings -> sessions
    await queryRunner.createForeignKey(
      'session_bookings',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sessions',
        onDelete: 'CASCADE',
        name: 'FK_booking_session',
      }),
    );

    // session_bookings -> student_packages (nullable)
    await queryRunner.createForeignKey(
      'session_bookings',
      new TableForeignKey({
        columnNames: ['studentPackageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'student_packages',
        onDelete: 'SET NULL',
        name: 'FK_booking_package',
      }),
    );

    // ===== CREATE INDEXES =====

    // class_packages indexes
    await queryRunner.createIndex(
      'class_packages',
      new TableIndex({
        name: 'IDX_class_packages_groupId',
        columnNames: ['groupId'],
      }),
    );

    await queryRunner.createIndex(
      'class_packages',
      new TableIndex({
        name: 'IDX_class_packages_isActive',
        columnNames: ['isActive'],
      }),
    );

    // student_packages indexes
    await queryRunner.createIndex(
      'student_packages',
      new TableIndex({
        name: 'IDX_student_packages_studentProfileId',
        columnNames: ['studentProfileId'],
      }),
    );

    await queryRunner.createIndex(
      'student_packages',
      new TableIndex({
        name: 'IDX_student_packages_packageId',
        columnNames: ['packageId'],
      }),
    );

    await queryRunner.createIndex(
      'student_packages',
      new TableIndex({
        name: 'IDX_student_packages_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'student_packages',
      new TableIndex({
        name: 'IDX_student_packages_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );

    await queryRunner.createIndex(
      'student_packages',
      new TableIndex({
        name: 'IDX_student_packages_studentProfileId_status',
        columnNames: ['studentProfileId', 'status'],
      }),
    );

    // session_bookings indexes
    await queryRunner.createIndex(
      'session_bookings',
      new TableIndex({
        name: 'IDX_session_bookings_studentProfileId',
        columnNames: ['studentProfileId'],
      }),
    );

    await queryRunner.createIndex(
      'session_bookings',
      new TableIndex({
        name: 'IDX_session_bookings_sessionId',
        columnNames: ['sessionId'],
      }),
    );

    await queryRunner.createIndex(
      'session_bookings',
      new TableIndex({
        name: 'IDX_session_bookings_studentPackageId',
        columnNames: ['studentPackageId'],
      }),
    );

    await queryRunner.createIndex(
      'session_bookings',
      new TableIndex({
        name: 'IDX_session_bookings_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'session_bookings',
      new TableIndex({
        name: 'IDX_session_bookings_sessionId_studentProfileId',
        columnNames: ['sessionId', 'studentProfileId'],
        isUnique: true,
      }),
    );

    // ===== ADD CHECK CONSTRAINTS =====

    // student_packages: remainingSessions >= 0
    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_remaining_sessions_non_negative"
      CHECK ("remainingSessions" >= 0);
    `);

    // student_packages: lockedSessions >= 0
    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_locked_sessions_non_negative"
      CHECK ("lockedSessions" >= 0);
    `);

    // student_packages: remainingSessions + lockedSessions <= totalSessions
    await queryRunner.query(`
      ALTER TABLE "student_packages"
      ADD CONSTRAINT "CHK_student_packages_sessions_consistency"
      CHECK (("remainingSessions" + "lockedSessions") <= "totalSessions");
    `);

    // class_packages: sessionCount > 0
    await queryRunner.query(`
      ALTER TABLE "class_packages"
      ADD CONSTRAINT "CHK_class_packages_session_count_positive"
      CHECK ("sessionCount" > 0);
    `);

    // class_packages: price >= 0
    await queryRunner.query(`
      ALTER TABLE "class_packages"
      ADD CONSTRAINT "CHK_class_packages_price_non_negative"
      CHECK ("price" >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== DROP CHECK CONSTRAINTS =====
    await queryRunner.query(`ALTER TABLE "class_packages" DROP CONSTRAINT IF EXISTS "CHK_class_packages_price_non_negative";`);
    await queryRunner.query(`ALTER TABLE "class_packages" DROP CONSTRAINT IF EXISTS "CHK_class_packages_session_count_positive";`);
    await queryRunner.query(`ALTER TABLE "student_packages" DROP CONSTRAINT IF EXISTS "CHK_student_packages_sessions_consistency";`);
    await queryRunner.query(`ALTER TABLE "student_packages" DROP CONSTRAINT IF EXISTS "CHK_student_packages_locked_sessions_non_negative";`);
    await queryRunner.query(`ALTER TABLE "student_packages" DROP CONSTRAINT IF EXISTS "CHK_student_packages_remaining_sessions_non_negative";`);

    // ===== DROP INDEXES =====
    await queryRunner.dropIndex('session_bookings', 'IDX_session_bookings_sessionId_studentProfileId');
    await queryRunner.dropIndex('session_bookings', 'IDX_session_bookings_status');
    await queryRunner.dropIndex('session_bookings', 'IDX_session_bookings_studentPackageId');
    await queryRunner.dropIndex('session_bookings', 'IDX_session_bookings_sessionId');
    await queryRunner.dropIndex('session_bookings', 'IDX_session_bookings_studentProfileId');

    await queryRunner.dropIndex('student_packages', 'IDX_student_packages_studentProfileId_status');
    await queryRunner.dropIndex('student_packages', 'IDX_student_packages_expiresAt');
    await queryRunner.dropIndex('student_packages', 'IDX_student_packages_status');
    await queryRunner.dropIndex('student_packages', 'IDX_student_packages_packageId');
    await queryRunner.dropIndex('student_packages', 'IDX_student_packages_studentProfileId');

    await queryRunner.dropIndex('class_packages', 'IDX_class_packages_isActive');
    await queryRunner.dropIndex('class_packages', 'IDX_class_packages_groupId');

    // ===== DROP FOREIGN KEY CONSTRAINTS =====
    await queryRunner.dropForeignKey('session_bookings', 'FK_booking_package');
    await queryRunner.dropForeignKey('session_bookings', 'FK_booking_session');
    await queryRunner.dropForeignKey('session_bookings', 'FK_booking_student');
    await queryRunner.dropForeignKey('student_packages', 'FK_student_packages_template');
    await queryRunner.dropForeignKey('student_packages', 'FK_student_packages_profile');
    await queryRunner.dropForeignKey('class_packages', 'FK_class_packages_group');

    // ===== DROP TABLES =====
    await queryRunner.dropTable('session_bookings');
    await queryRunner.dropTable('student_packages');
    await queryRunner.dropTable('class_packages');
  }
}

