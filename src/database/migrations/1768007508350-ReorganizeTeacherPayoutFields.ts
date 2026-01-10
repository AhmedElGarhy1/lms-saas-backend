import { MigrationInterface, QueryRunner } from "typeorm";

export class ReorganizeTeacherPayoutFields1768007508350 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the new last_payment_amount column
        await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            ADD COLUMN last_payment_amount DECIMAL(10,2) NULL
        `);

        // Rename unit_price to unit_rate
        await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            RENAME COLUMN unit_price TO unit_rate
        `);

        // For existing CLASS payouts, move unitRate (which was misused as last payment) to lastPaymentAmount
        await queryRunner.query(`
            UPDATE teacher_payout_records
            SET last_payment_amount = unit_rate
            WHERE unit_type = 'CLASS' AND unit_rate > 0
        `);

        // For CLASS payouts, set unitRate to 0 since they don't have unit rates
        await queryRunner.query(`
            UPDATE teacher_payout_records
            SET unit_rate = 0
            WHERE unit_type = 'CLASS'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse: rename unit_rate back to unit_price
        await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            RENAME COLUMN unit_rate TO unit_price
        `);

        // Drop the last_payment_amount column
        await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            DROP COLUMN last_payment_amount
        `);
    }

}
