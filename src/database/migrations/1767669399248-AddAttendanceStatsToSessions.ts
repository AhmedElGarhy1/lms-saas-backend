import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttendanceStatsToSessions1767669399248 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD COLUMN "presentCount" integer NOT NULL DEFAULT 0,
            ADD COLUMN "lateCount" integer NOT NULL DEFAULT 0,
            ADD COLUMN "excusedCount" integer NOT NULL DEFAULT 0,
            ADD COLUMN "absentCount" integer NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions"
            DROP COLUMN "presentCount",
            DROP COLUMN "lateCount",
            DROP COLUMN "excusedCount",
            DROP COLUMN "absentCount"
        `);
    }

}
