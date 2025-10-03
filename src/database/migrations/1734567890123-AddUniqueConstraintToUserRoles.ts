import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToUserRoles1734567890123
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToUserRoles1734567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove any duplicate user roles (keep the latest one for each user-center combination)
    await queryRunner.query(`
      DELETE FROM user_roles 
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, center_id) id 
        FROM user_roles 
        ORDER BY user_id, center_id, created_at DESC
      )
    `);

    // Add unique constraint on userId and centerId
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT "UQ_user_roles_user_id_center_id" 
      UNIQUE (user_id, center_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint
    await queryRunner.query(`
      ALTER TABLE user_roles 
      DROP CONSTRAINT "UQ_user_roles_user_id_center_id"
    `);
  }
}
