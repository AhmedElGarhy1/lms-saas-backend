import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFcmTokenToUserDevices20260129000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_devices');
    if (!table) return;

    const hasColumn = table.findColumnByName('fcmToken');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'user_devices',
        new TableColumn({
          name: 'fcmToken',
          type: 'varchar',
          length: '256',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_devices');
    if (!table?.findColumnByName('fcmToken')) return;
    await queryRunner.dropColumn('user_devices', 'fcmToken');
  }
}
