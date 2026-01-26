import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename system permissions to settings permissions
 * system:read -> settings:read (may have been system:view before)
 * system:update -> settings:update
 */
export class RenameSystemPermissionsToSettings20260126200320
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update system:read to settings:read
    // Note: system:read may have been created from system:view in a previous migration
    await queryRunner.query(
      `UPDATE permissions 
       SET action = 'settings:read' 
       WHERE action = 'system:read';`,
    );

    // Also handle any remaining system:view (in case previous migration didn't run)
    await queryRunner.query(
      `UPDATE permissions 
       SET action = 'settings:read' 
       WHERE action = 'system:view';`,
    );

    // Update system:update to settings:update
    await queryRunner.query(
      `UPDATE permissions 
       SET action = 'settings:update' 
       WHERE action = 'system:update';`,
    );

    // Handle case where both system:view and system:read might have been updated to settings:read
    // If duplicates exist (same action and scope), keep the most recent one
    await queryRunner.query(
      `DELETE FROM permissions p1
       WHERE p1.action = 'settings:read'
       AND EXISTS (
         SELECT 1 FROM permissions p2
         WHERE p2.action = 'settings:read'
         AND p2.scope = p1.scope
         AND p2."createdAt" > p1."createdAt"
       );`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert settings:read back to system:read
    await queryRunner.query(
      `UPDATE permissions 
       SET action = 'system:read' 
       WHERE action = 'settings:read';`,
    );

    // Revert settings:update back to system:update
    await queryRunner.query(
      `UPDATE permissions 
       SET action = 'system:update' 
       WHERE action = 'settings:update';`,
    );
  }
}
