import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddActorIdToActivityLogs1734567890124
  implements MigrationInterface
{
  name = 'AddActorIdToActivityLogs1734567890124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add actorId column
    await queryRunner.addColumn(
      'activity_logs',
      new TableColumn({
        name: 'actorId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Migrate existing data: set actorId = userId (preserve current behavior)
    await queryRunner.query(`
      UPDATE activity_logs 
      SET "actorId" = "userId"
      WHERE "actorId" IS NULL
    `);

    // Add foreign key constraint for actorId
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        columnNames: ['actorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'IDX_activity_logs_actorId',
        columnNames: ['actorId'],
      }),
    );

    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'IDX_activity_logs_actorId_centerId_type_createdAt',
        columnNames: ['actorId', 'centerId', 'type', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'activity_logs',
      'IDX_activity_logs_actorId_centerId_type_createdAt',
    );

    await queryRunner.dropIndex(
      'activity_logs',
      'IDX_activity_logs_actorId',
    );

    // Drop foreign key
    const table = await queryRunner.getTable('activity_logs');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('actorId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('activity_logs', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('activity_logs', 'actorId');
  }
}

