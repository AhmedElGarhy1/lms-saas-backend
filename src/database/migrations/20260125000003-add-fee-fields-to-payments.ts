import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddFeeFieldsToPayments20260125000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add feeAmount column
    await queryRunner.addColumn(
      'payments',
      new TableColumn({
        name: 'feeAmount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
    );

    // Add netAmount column
    await queryRunner.addColumn(
      'payments',
      new TableColumn({
        name: 'netAmount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
    );

    // Add index on feeAmount for reporting queries
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_feeAmount',
        columnNames: ['feeAmount'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('payments', 'IDX_payments_feeAmount');

    // Drop columns
    await queryRunner.dropColumn('payments', 'netAmount');
    await queryRunner.dropColumn('payments', 'feeAmount');
  }
}
