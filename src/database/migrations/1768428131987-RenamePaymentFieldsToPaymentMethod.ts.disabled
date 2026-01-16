import { MigrationInterface, QueryRunner } from "typeorm";

export class RenamePaymentFieldsToPaymentMethod1768428131987 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename payment fields to use consistent naming
        await queryRunner.query(`ALTER TABLE "student_charges" RENAME COLUMN "paymentSource" TO "paymentMethod"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "source" TO "paymentMethod"`);
        await queryRunner.query(`ALTER TABLE "teacher_payout_records" RENAME COLUMN "paymentSource" TO "paymentMethod"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert column renames
        await queryRunner.query(`ALTER TABLE "teacher_payout_records" RENAME COLUMN "paymentMethod" TO "paymentSource"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "paymentMethod" TO "source"`);
        await queryRunner.query(`ALTER TABLE "student_charges" RENAME COLUMN "paymentMethod" TO "paymentSource"`);
    }

}
