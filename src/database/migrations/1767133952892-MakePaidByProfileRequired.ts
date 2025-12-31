import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePaidByProfileRequired1767133952892
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make paidByProfileId column NOT NULL
    // Note: Ensure all existing records have paidByProfileId set before running this migration
    await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            ALTER COLUMN "paidByProfileId" SET NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make paidByProfileId column nullable again
    await queryRunner.query(`
            ALTER TABLE "cash_transactions"
            ALTER COLUMN "paidByProfileId" DROP NOT NULL
        `);
  }
}
