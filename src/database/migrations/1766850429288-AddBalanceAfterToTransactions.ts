import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceAfterToTransactions1766850429288 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD COLUMN "balanceAfter" decimal(12,2) NOT NULL COMMENT 'Wallet balance after this transaction was applied'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "transactions" DROP COLUMN "balanceAfter"
        `);
    }

}
