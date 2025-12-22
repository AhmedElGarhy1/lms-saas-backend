import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create sessions table
 * Sessions represent individual class sessions generated from ScheduleItem templates
 */
export class CreateSessionsTable1766338247000 implements MigrationInterface {
  name = 'CreateSessionsTable1766338247000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "groupId" UUID NOT NULL,
        "scheduleItemId" UUID NULL,
        "title" VARCHAR(255) NULL,
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        "isExtraSession" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "createdBy" UUID NOT NULL,
        "updatedBy" UUID NULL,
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_schedule_item" FOREIGN KEY ("scheduleItemId") REFERENCES "schedule_items"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_sessions_created_by" FOREIGN KEY ("createdBy") REFERENCES "users"("id"),
        CONSTRAINT "FK_sessions_updated_by" FOREIGN KEY ("updatedBy") REFERENCES "users"("id")
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_groupId" ON "sessions" ("groupId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_scheduleItemId" ON "sessions" ("scheduleItemId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_startTime" ON "sessions" ("startTime");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_status" ON "sessions" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_groupId_status" ON "sessions" ("groupId", "status");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_sessions_groupId_startTime_unique" ON "sessions" ("groupId", "startTime");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_groupId_startTime_unique";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_groupId_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_startTime";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_scheduleItemId";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sessions_groupId";
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "sessions";
    `);
  }
}

