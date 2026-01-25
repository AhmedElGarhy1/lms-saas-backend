import { MigrationInterface, QueryRunner } from 'typeorm';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';

export class CreateSystemWallet20260125000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if system wallet already exists
    const existing = await queryRunner.query(
      `SELECT id FROM wallets WHERE "ownerId" = $1 AND "ownerType" = $2`,
      [SYSTEM_USER_ID, 'SYSTEM'],
    );

    // Only insert if it doesn't exist
    if (existing.length === 0) {
      await queryRunner.query(
        `INSERT INTO wallets (id, "ownerId", "ownerType", balance, "createdAt", "updatedAt", "createdByProfileId")
         VALUES (uuid_generate_v4(), $1, $2, '0.00', NOW(), NOW(), $1)`,
        [SYSTEM_USER_ID, 'SYSTEM'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove system wallet
    await queryRunner.query(
      `DELETE FROM wallets WHERE "ownerId" = $1 AND "ownerType" = $2`,
      [SYSTEM_USER_ID, 'SYSTEM'],
    );
  }
}
