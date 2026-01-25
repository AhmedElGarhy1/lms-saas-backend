import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsPermissions20260125000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert SYSTEM settings permissions if they don't exist
    const permissions = [
      { action: 'system:view', scope: 'ADMIN' },
      { action: 'system:update', scope: 'ADMIN' },
    ];

    for (const permission of permissions) {
      // Check if permission already exists
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const existing = await queryRunner.query(
        `SELECT id FROM permissions WHERE action = $1`,
        [permission.action],
      );

      // Only insert if it doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO permissions (action, scope, "createdAt") VALUES ($1, $2, NOW())`,
          [permission.action, permission.scope],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove SYSTEM settings permissions
    await queryRunner.query(`
      DELETE FROM permissions 
      WHERE action IN (
        'system:view',
        'system:update'
      );
    `);
  }
}
