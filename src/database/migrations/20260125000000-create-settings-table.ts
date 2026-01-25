import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';

export class CreateSettingsTable20260125000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'STRING'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdByProfileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedByProfileId',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique index on key
    await queryRunner.createIndex(
      'settings',
      new TableIndex({
        name: 'IDX_settings_key',
        columnNames: ['key'],
        isUnique: true,
      }),
    );

    // Seed initial values
    await queryRunner.query(
      `INSERT INTO settings (key, value, type, description, "createdByProfileId", "createdAt", "updatedAt")
       VALUES 
         ('fees', '0', 'DECIMAL', 'System fees percentage (e.g., 2.5 for 2.5%)', $1, NOW(), NOW()),
         ('maxDebit', '0', 'DECIMAL', 'Maximum debit amount allowed (in EGP)', $1, NOW(), NOW()),
         ('maxNegativeBalance', '1000', 'DECIMAL', 'Maximum allowed negative balance for wallets when deducting system fees (in EGP)', $1, NOW(), NOW())
       ON CONFLICT (key) DO NOTHING`,
      [SYSTEM_USER_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('settings', 'IDX_settings_key');

    // Drop table
    await queryRunner.dropTable('settings');
  }
}
