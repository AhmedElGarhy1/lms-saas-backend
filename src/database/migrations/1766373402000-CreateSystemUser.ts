import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to ensure system user exists with fixed UUID.
 * The system user represents all automated system actions (cron jobs, background tasks).
 * This migration is idempotent - it will not fail if the user already exists.
 */
export class CreateSystemUser1766373402000 implements MigrationInterface {
  name = 'CreateSystemUser1766373402000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const SYSTEM_USER_PHONE = '01000000000';
    const SYSTEM_USER_NAME = 'System User';
    const SYSTEM_USER_PASSWORD =
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5'; // bcrypt hash of 'system123'

    // Check if system user already exists
    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE id = $1 OR phone = $2`,
      [SYSTEM_USER_ID, SYSTEM_USER_PHONE],
    );

    if (existingUser && existingUser.length > 0) {
      // If user exists with different UUID, we could migrate it, but for now just log
      if (existingUser[0].id !== SYSTEM_USER_ID) {
        console.log(
          `System user exists with different UUID: ${existingUser[0].id}. Consider migrating to ${SYSTEM_USER_ID}`,
        );
      }
      return; // User already exists
    }

    // Temporarily disable foreign key constraints to allow self-referencing createdBy
    await queryRunner.query('SET session_replication_role = replica');

    // Insert system user with fixed UUID
    await queryRunner.query(
      `INSERT INTO users (
        id, 
        password, 
        name, 
        "isActive", 
        "createdBy", 
        phone, 
        "phoneVerified", 
        "createdAt", 
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [
        SYSTEM_USER_ID,
        SYSTEM_USER_PASSWORD,
        SYSTEM_USER_NAME,
        true,
        SYSTEM_USER_ID, // createdBy is self for system user
        SYSTEM_USER_PHONE,
      ],
    );

    // Generate UUID for user_info
    const profileResult = await queryRunner.query(
      'SELECT gen_random_uuid() as id',
    );
    const profileUuid = profileResult[0].id;

    // Insert user_info for system user
    await queryRunner.query(
      `INSERT INTO user_info (
        id, 
        "userId", 
        address, 
        locale, 
        "createdAt", 
        "updatedAt", 
        "createdBy", 
        "updatedBy"
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6)
      ON CONFLICT (id) DO NOTHING`,
      [
        profileUuid,
        SYSTEM_USER_ID,
        'System',
        'en',
        SYSTEM_USER_ID,
        SYSTEM_USER_ID,
      ],
    );

    // Re-enable foreign key constraints
    await queryRunner.query('SET session_replication_role = DEFAULT');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    // Delete user_info first (due to foreign key)
    await queryRunner.query(`DELETE FROM user_info WHERE "userId" = $1`, [
      SYSTEM_USER_ID,
    ]);

    // Delete system user
    await queryRunner.query(`DELETE FROM users WHERE id = $1`, [
      SYSTEM_USER_ID,
    ]);
  }
}
