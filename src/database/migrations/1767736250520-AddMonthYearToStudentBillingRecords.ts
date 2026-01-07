import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMonthYearToStudentBillingRecords1767736250520 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "student_billing_records"
            ADD COLUMN "month" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "student_billing_records"
            ADD COLUMN "year" integer
        `);

        // Add indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_student_billing_records_month" ON "student_billing_records" ("month")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_student_billing_records_year" ON "student_billing_records" ("year")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX "IDX_student_billing_records_year"`);
        await queryRunner.query(`DROP INDEX "IDX_student_billing_records_month"`);

        // Drop columns
        await queryRunner.query(`
            ALTER TABLE "student_billing_records"
            DROP COLUMN "year"
        `);

        await queryRunner.query(`
            ALTER TABLE "student_billing_records"
            DROP COLUMN "month"
        `);
    }

}
