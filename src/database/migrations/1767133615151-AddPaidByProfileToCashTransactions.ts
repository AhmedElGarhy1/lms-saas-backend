import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaidByProfileToCashTransactions1767133615151 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add paidByProfileId column to cash_transactions table
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            ADD COLUMN "paidByProfileId" uuid
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            ADD CONSTRAINT "FK_cash_transactions_paidByProfileId"
            FOREIGN KEY ("paidByProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL
        `);

        // Add index for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_cash_transactions_paidByProfileId" ON "cash_transactions" ("paidByProfileId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            DROP CONSTRAINT "FK_cash_transactions_paidByProfileId"
        `);

        // Drop index
        await queryRunner.query(`
            DROP INDEX "IDX_cash_transactions_paidByProfileId"
        `);

        // Drop column
        await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            DROP COLUMN "paidByProfileId"
        `);
    }

}
