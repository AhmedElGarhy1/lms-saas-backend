import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameStudentSessionPaymentsToEnrollments1766941445999 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename table from student_session_payments to enrollments
        await queryRunner.query(`ALTER TABLE "student_session_payments" RENAME TO "enrollments"`);

        // Rename columns to match new enrollment terminology
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "student_profile_id" TO "student_id"`);
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "type" TO "payment_method"`);
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "status" TO "enrollment_status"`);

        // Add new enrollment-specific columns
        await queryRunner.query(`ALTER TABLE "enrollments" ADD COLUMN "is_attended" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD COLUMN "checked_in_at" TIMESTAMPTZ`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD COLUMN "cancelled_at" TIMESTAMPTZ`);

        // Update indexes to use new column names
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_session_payments_student_profile_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_session_payments_session_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_session_payments_student_package_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_session_payments_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_session_payments_unique"`);

        // Create new indexes with updated names
        await queryRunner.query(`CREATE INDEX "IDX_enrollments_student_id" ON "enrollments" ("student_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_enrollments_session_id" ON "enrollments" ("session_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_enrollments_package_id" ON "enrollments" ("student_package_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_enrollments_status" ON "enrollments" ("enrollment_status")`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "UQ_enrollments_session_student" UNIQUE ("session_id", "student_id")`);

        // Rename foreign key column
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "student_package_id" TO "package_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the changes for rollback

        // Remove new enrollment-specific columns
        await queryRunner.query(`ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "cancelled_at"`);
        await queryRunner.query(`ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "checked_in_at"`);
        await queryRunner.query(`ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "is_attended"`);

        // Rename foreign key column back
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "package_id" TO "student_package_id"`);

        // Drop new indexes and constraints
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_student_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_session_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_package_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_status"`);
        await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "UQ_enrollments_session_student"`);

        // Rename columns back to original names
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "enrollment_status" TO "status"`);
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "payment_method" TO "type"`);
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "student_id" TO "student_profile_id"`);

        // Recreate original indexes
        await queryRunner.query(`CREATE INDEX "IDX_student_session_payments_student_profile_id" ON "enrollments" ("student_profile_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_session_payments_session_id" ON "enrollments" ("session_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_session_payments_student_package_id" ON "enrollments" ("student_package_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_student_session_payments_status" ON "enrollments" ("status")`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "IDX_student_session_payments_unique" UNIQUE ("session_id", "student_profile_id")`);

        // Rename table back
        await queryRunner.query(`ALTER TABLE "enrollments" RENAME TO "student_session_payments"`);
    }

}
