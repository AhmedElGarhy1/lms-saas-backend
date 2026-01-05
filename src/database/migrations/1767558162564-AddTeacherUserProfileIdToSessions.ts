import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeacherUserProfileIdToSessions1767558162564 implements MigrationInterface {
    name = 'AddTeacherUserProfileIdToSessions1767558162564';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the teacherUserProfileId column as nullable first
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD COLUMN "teacherUserProfileId" uuid
        `);

        // Populate the column with data from classes table
        await queryRunner.query(`
            UPDATE "sessions"
            SET "teacherUserProfileId" = "classes"."teacherUserProfileId"
            FROM "classes"
            WHERE "sessions"."classId" = "classes"."id"
        `);

        // Make the column NOT NULL
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ALTER COLUMN "teacherUserProfileId" SET NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the teacherUserProfileId column
        await queryRunner.query(`
            ALTER TABLE "sessions"
            DROP COLUMN "teacherUserProfileId"
        `);
    }

}
