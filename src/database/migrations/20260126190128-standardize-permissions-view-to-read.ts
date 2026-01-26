import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to standardize permission naming from VIEW to READ
 * Updates all permission actions and maintains referential integrity
 */
export class StandardizePermissionsViewToRead20260126190128
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mapping of old action names to new action names
    const permissionUpdates = [
      // Student Billing
      {
        old: 'student-billing:view-student-charge',
        new: 'student-billing:read-student-charge',
      },
      {
        old: 'student-billing:view-student-records',
        new: 'student-billing:read-student-records',
      },
      // Teacher Payouts
      {
        old: 'teacher-payouts:view-payouts',
        new: 'teacher-payouts:read-payouts',
      },
      // Finance
      {
        old: 'finance:view-payments',
        new: 'finance:read-payments',
      },
      {
        old: 'finance:view-treasury',
        new: 'finance:read-treasury',
      },
      {
        old: 'finance:view-wallet-statement',
        new: 'finance:read-wallet-statement',
      },
      {
        old: 'finance:view-cash-statement',
        new: 'finance:read-cash-statement',
      },
      // Expenses
      {
        old: 'expenses:view',
        new: 'expenses:read',
      },
      // Dashboard
      {
        old: 'dashboard:view',
        new: 'dashboard:read',
      },
      {
        old: 'dashboard:view-all-centers',
        new: 'dashboard:read-all-centers',
      },
      // System
      {
        old: 'system:view',
        new: 'system:read',
      },
    ];

    // Update each permission action
    for (const update of permissionUpdates) {
      // Check if old permission exists
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const existing = await queryRunner.query(
        `SELECT id FROM permissions WHERE action = $1`,
        [update.old],
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (existing.length > 0) {
        // Check if new permission already exists (shouldn't happen, but safety check)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const newExists = await queryRunner.query(
          `SELECT id FROM permissions WHERE action = $1`,
          [update.new],
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (newExists.length === 0) {
          // Update the permission action
          await queryRunner.query(
            `UPDATE permissions SET action = $1 WHERE action = $2`,
            [update.new, update.old],
          );
        } else {
          // If new permission already exists, we need to merge:
          // 1. Update all role_permissions to point to the new permission
          // 2. Delete the old permission
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const oldPermissionId = existing[0].id;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const newPermissionId = newExists[0].id;

          // Update role_permissions to use new permission ID
          await queryRunner.query(
            `UPDATE role_permissions 
             SET "permissionId" = $1 
             WHERE "permissionId" = $2 
             AND NOT EXISTS (
               SELECT 1 FROM role_permissions 
               WHERE "roleId" = role_permissions."roleId" 
               AND "permissionId" = $1
             )`,
            [newPermissionId, oldPermissionId],
          );

          // Delete duplicate role_permissions (where both old and new exist for same role)
          await queryRunner.query(
            `DELETE FROM role_permissions 
             WHERE "permissionId" = $1 
             AND EXISTS (
               SELECT 1 FROM role_permissions rp2 
               WHERE rp2."roleId" = role_permissions."roleId" 
               AND rp2."permissionId" = $2
             )`,
            [oldPermissionId, newPermissionId],
          );

          // Delete the old permission
          await queryRunner.query(
            `DELETE FROM permissions WHERE id = $1`,
            [oldPermissionId],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse mapping: new action names back to old action names
    const permissionReverts = [
      // Student Billing
      {
        new: 'student-billing:read-student-charge',
        old: 'student-billing:view-student-charge',
      },
      {
        new: 'student-billing:read-student-records',
        old: 'student-billing:view-student-records',
      },
      // Teacher Payouts
      {
        new: 'teacher-payouts:read-payouts',
        old: 'teacher-payouts:view-payouts',
      },
      // Finance
      {
        new: 'finance:read-payments',
        old: 'finance:view-payments',
      },
      {
        new: 'finance:read-treasury',
        old: 'finance:view-treasury',
      },
      {
        new: 'finance:read-wallet-statement',
        old: 'finance:view-wallet-statement',
      },
      {
        new: 'finance:read-cash-statement',
        old: 'finance:view-cash-statement',
      },
      // Expenses
      {
        new: 'expenses:read',
        old: 'expenses:view',
      },
      // Dashboard
      {
        new: 'dashboard:read',
        old: 'dashboard:view',
      },
      {
        new: 'dashboard:read-all-centers',
        old: 'dashboard:view-all-centers',
      },
      // System
      {
        new: 'system:read',
        old: 'system:view',
      },
    ];

    // Revert each permission action
    for (const revert of permissionReverts) {
      // Check if new permission exists
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const existing = await queryRunner.query(
        `SELECT id FROM permissions WHERE action = $1`,
        [revert.new],
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (existing.length > 0) {
        // Check if old permission already exists
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const oldExists = await queryRunner.query(
          `SELECT id FROM permissions WHERE action = $1`,
          [revert.old],
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (oldExists.length === 0) {
          // Simply revert the action name
          await queryRunner.query(
            `UPDATE permissions SET action = $1 WHERE action = $2`,
            [revert.old, revert.new],
          );
        } else {
          // If old permission exists, merge back (same logic as up migration)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const newPermissionId = existing[0].id;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const oldPermissionId = oldExists[0].id;

          // Update role_permissions to use old permission ID
          await queryRunner.query(
            `UPDATE role_permissions 
             SET "permissionId" = $1 
             WHERE "permissionId" = $2 
             AND NOT EXISTS (
               SELECT 1 FROM role_permissions 
               WHERE "roleId" = role_permissions."roleId" 
               AND "permissionId" = $1
             )`,
            [oldPermissionId, newPermissionId],
          );

          // Delete duplicate role_permissions
          await queryRunner.query(
            `DELETE FROM role_permissions 
             WHERE "permissionId" = $1 
             AND EXISTS (
               SELECT 1 FROM role_permissions rp2 
               WHERE rp2."roleId" = role_permissions."roleId" 
               AND rp2."permissionId" = $2
             )`,
            [newPermissionId, oldPermissionId],
          );

          // Delete the new permission
          await queryRunner.query(
            `DELETE FROM permissions WHERE id = $1`,
            [newPermissionId],
          );
        }
      }
    }
  }
}
