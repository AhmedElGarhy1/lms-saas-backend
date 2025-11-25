import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove twoFactorSecret column
 * 2FA has been migrated from TOTP (authenticator apps) to SMS OTP
 * The twoFactorSecret field is no longer needed
 */
export class RemoveTwoFactorSecret1764030000000
  implements MigrationInterface
{
  name = 'RemoveTwoFactorSecret1764030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the twoFactorSecret column as it's no longer used
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "twoFactorSecret";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column for rollback (nullable since we can't restore old secrets)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "twoFactorSecret" VARCHAR(255);
    `);
  }
}

