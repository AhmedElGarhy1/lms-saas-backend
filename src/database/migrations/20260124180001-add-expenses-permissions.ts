import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpensesPermissions20260124180001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert EXPENSES permissions if they don't exist
    const permissions = [
      { action: 'expenses:create', scope: 'CENTER' },
      { action: 'expenses:view', scope: 'CENTER' },
      { action: 'expenses:update', scope: 'CENTER' },
      { action: 'expenses:refund', scope: 'CENTER' },
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
    // Remove EXPENSES permissions
    await queryRunner.query(`
      DELETE FROM permissions 
      WHERE action IN (
        'expenses:create',
        'expenses:view',
        'expenses:update',
        'expenses:refund'
      );
    `);
  }
}
