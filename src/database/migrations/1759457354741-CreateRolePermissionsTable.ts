import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRolePermissionsTable1759457354741
  implements MigrationInterface
{
  name = 'CreateRolePermissionsTable1759457354741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'roleId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'permissionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'permissionScope',
            type: 'enum',
            enum: ['ADMIN', 'CENTER', 'BOTH'],
            default: "'CENTER'",
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['roleId'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['permissionId'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_role_permissions_user_role_permission" 
      ON "role_permissions" ("userId", "roleId", "permissionId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_user_id" 
      ON "role_permissions" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_role_id" 
      ON "role_permissions" ("roleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_permission_id" 
      ON "role_permissions" ("permissionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions');
  }
}
