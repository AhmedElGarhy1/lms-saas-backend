import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationHistoryPermission20260127225814
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert NOTIFICATIONS permission if it doesn't exist
    const permission = {
      action: 'notifications:read-history',
      scope: 'ADMIN',
    };

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove NOTIFICATIONS permission
    await queryRunner.query(`
      DELETE FROM permissions 
      WHERE action = 'notifications:read-history';
    `);
  }
}
