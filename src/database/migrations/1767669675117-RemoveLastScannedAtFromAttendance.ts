import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLastScannedAtFromAttendance1767669675117
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "attendance"
            DROP COLUMN "lastScannedAt"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "attendance"
            ADD COLUMN "lastScannedAt" timestamptz
        `);
  }
}
