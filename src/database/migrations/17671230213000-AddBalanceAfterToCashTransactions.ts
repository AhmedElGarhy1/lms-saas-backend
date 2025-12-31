import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceAfterToCashTransactions17671230213000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add balanceAfter column to cash_transactions table
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            ADD COLUMN "balanceAfter" decimal(12,2) NOT NULL DEFAULT '0.00'
        `);

        // Add comment to the column
        await queryRunner.query(`
            COMMENT ON COLUMN "cash_transactions"."balanceAfter" IS 'Cashbox balance after this transaction was applied'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove balanceAfter column from cash_transactions table
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            DROP COLUMN "balanceAfter"
        `);
    }

}
