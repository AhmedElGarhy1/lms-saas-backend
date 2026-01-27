import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddIdempotencyKeyToFinanceTables20260127130645
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add idempotencyKey to expenses table
    const expensesTable = await queryRunner.getTable('expenses');
    if (expensesTable) {
      const idempotencyKeyColumn = expensesTable.findColumnByName(
        'idempotencyKey',
      );
      if (!idempotencyKeyColumn) {
        await queryRunner.addColumn(
          'expenses',
          new TableColumn({
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
        );

        // Add unique index on idempotencyKey
        await queryRunner.createIndex(
          'expenses',
          new TableIndex({
            name: 'IDX_expenses_idempotencyKey',
            columnNames: ['idempotencyKey'],
            isUnique: true,
          }),
        );
      }
    }

    // Add idempotencyKey to teacher_payout_records table
    const teacherPayoutRecordsTable = await queryRunner.getTable(
      'teacher_payout_records',
    );
    if (teacherPayoutRecordsTable) {
      const idempotencyKeyColumn = teacherPayoutRecordsTable.findColumnByName(
        'idempotencyKey',
      );
      if (!idempotencyKeyColumn) {
        await queryRunner.addColumn(
          'teacher_payout_records',
          new TableColumn({
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
        );

        // Add unique index on idempotencyKey
        await queryRunner.createIndex(
          'teacher_payout_records',
          new TableIndex({
            name: 'IDX_teacher_payout_records_idempotencyKey',
            columnNames: ['idempotencyKey'],
            isUnique: true,
          }),
        );
      }
    }

    // Add idempotencyKey to payments table (if it doesn't exist)
    const paymentsTable = await queryRunner.getTable('payments');
    if (paymentsTable) {
      const idempotencyKeyColumn = paymentsTable.findColumnByName(
        'idempotencyKey',
      );
      if (!idempotencyKeyColumn) {
        await queryRunner.addColumn(
          'payments',
          new TableColumn({
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
        );

        // Add unique index on idempotencyKey (the entity already has @Index with unique: true)
        await queryRunner.createIndex(
          'payments',
          new TableIndex({
            name: 'IDX_payments_idempotencyKey',
            columnNames: ['idempotencyKey'],
            isUnique: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes and columns in reverse order

    // Drop from payments
    const paymentsTable = await queryRunner.getTable('payments');
    if (paymentsTable) {
      const idempotencyKeyIndex = paymentsTable.indices.find(
        (idx) => idx.name === 'IDX_payments_idempotencyKey',
      );
      if (idempotencyKeyIndex) {
        await queryRunner.dropIndex('payments', 'IDX_payments_idempotencyKey');
      }

      const idempotencyKeyColumn = paymentsTable.findColumnByName(
        'idempotencyKey',
      );
      if (idempotencyKeyColumn) {
        await queryRunner.dropColumn('payments', 'idempotencyKey');
      }
    }

    // Drop from teacher_payout_records
    const teacherPayoutRecordsTable = await queryRunner.getTable(
      'teacher_payout_records',
    );
    if (teacherPayoutRecordsTable) {
      const idempotencyKeyIndex = teacherPayoutRecordsTable.indices.find(
        (idx) => idx.name === 'IDX_teacher_payout_records_idempotencyKey',
      );
      if (idempotencyKeyIndex) {
        await queryRunner.dropIndex(
          'teacher_payout_records',
          'IDX_teacher_payout_records_idempotencyKey',
        );
      }

      const idempotencyKeyColumn = teacherPayoutRecordsTable.findColumnByName(
        'idempotencyKey',
      );
      if (idempotencyKeyColumn) {
        await queryRunner.dropColumn(
          'teacher_payout_records',
          'idempotencyKey',
        );
      }
    }

    // Drop from expenses
    const expensesTable = await queryRunner.getTable('expenses');
    if (expensesTable) {
      const idempotencyKeyIndex = expensesTable.indices.find(
        (idx) => idx.name === 'IDX_expenses_idempotencyKey',
      );
      if (idempotencyKeyIndex) {
        await queryRunner.dropIndex('expenses', 'IDX_expenses_idempotencyKey');
      }

      const idempotencyKeyColumn = expensesTable.findColumnByName(
        'idempotencyKey',
      );
      if (idempotencyKeyColumn) {
        await queryRunner.dropColumn('expenses', 'idempotencyKey');
      }
    }
  }
}
