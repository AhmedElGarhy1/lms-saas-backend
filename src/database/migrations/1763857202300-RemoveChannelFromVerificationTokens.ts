import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove channel column from verification_tokens table
 * Channel is no longer needed as OTP codes are channel-agnostic
 */
export class RemoveChannelFromVerificationTokens1763857202300
  implements MigrationInterface
{
  name = 'RemoveChannelFromVerificationTokens1763857202300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint that includes channel
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_verification_tokens_userId_type_channel";
    `);

    // Drop the channel index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_verification_tokens_channel";
    `);

    // Create new unique constraint without channel
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_verification_tokens_userId_type"
      ON "verification_tokens" ("userId", "type");
    `);

    // Drop the channel column
    await queryRunner.query(`
      ALTER TABLE "verification_tokens" 
      DROP COLUMN IF EXISTS "channel";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add channel column back
    await queryRunner.query(`
      ALTER TABLE "verification_tokens" 
      ADD COLUMN "channel" VARCHAR(20);
    `);

    // Drop the unique constraint without channel
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_verification_tokens_userId_type";
    `);

    // Recreate channel index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_verification_tokens_channel"
      ON "verification_tokens" ("channel");
    `);

    // Recreate unique constraint with channel
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_verification_tokens_userId_type_channel"
      ON "verification_tokens" ("userId", "type", "channel");
    `);
  }
}

