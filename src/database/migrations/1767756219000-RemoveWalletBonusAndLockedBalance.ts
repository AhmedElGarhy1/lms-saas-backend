import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWalletBonusAndLockedBalance1767756219000
  implements MigrationInterface
{
  name = 'RemoveWalletBonusAndLockedBalance1767756219000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the bonus_balance and locked_balance columns from wallets table
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN IF EXISTS "bonus_balance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN IF EXISTS "locked_balance"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns (for rollback)
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD COLUMN "bonus_balance" decimal(12,2) NOT NULL DEFAULT '0.00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD COLUMN "locked_balance" decimal(12,2) NOT NULL DEFAULT '0.00'`,
    );
  }
}
