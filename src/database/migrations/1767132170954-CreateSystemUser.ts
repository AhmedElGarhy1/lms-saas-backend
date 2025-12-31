import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSystemUser1767132170954 implements MigrationInterface {
    private readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if system user already exists
        const existingUser = await queryRunner.query(`
            SELECT id FROM users WHERE id = '${this.SYSTEM_USER_ID}'
        `);

        if (existingUser.length === 0) {
            // Create system user
            await queryRunner.query(`
                INSERT INTO users (
                    id,
                    name,
                    phone,
                    password,
                    "isActive",
                    "twoFactorEnabled",
                    "createdBy",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    '${this.SYSTEM_USER_ID}',
                    'System User',
                    '01000000000',
                    '',
                    true,
                    false,
                    '${this.SYSTEM_USER_ID}',
                    NOW(),
                    NOW()
                )
            `);
        }

        // Check if system user profile already exists
        const existingProfile = await queryRunner.query(`
            SELECT id FROM user_profiles WHERE id = '${this.SYSTEM_USER_ID}'
        `);

        if (existingProfile.length === 0) {
            // Create system user profile - generate a unique code
            const code = 'SYS001';
            await queryRunner.query(`
                INSERT INTO user_profiles (
                    id,
                    "userId",
                    code,
                    "profileType",
                    "profileRefId",
                    "isActive",
                    "createdBy",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    '${this.SYSTEM_USER_ID}',
                    '${this.SYSTEM_USER_ID}',
                    '${code}',
                    'Admin',
                    '${this.SYSTEM_USER_ID}',
                    true,
                    '${this.SYSTEM_USER_ID}',
                    NOW(),
                    NOW()
                )
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove system user profile first (due to foreign key constraints)
        await queryRunner.query(`
            DELETE FROM user_profiles
            WHERE id = '${this.SYSTEM_USER_ID}'
        `);

        // Remove system user
        await queryRunner.query(`
            DELETE FROM users
            WHERE id = '${this.SYSTEM_USER_ID}'
        `);
    }

}
