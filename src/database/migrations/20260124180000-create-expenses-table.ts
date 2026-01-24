import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateExpensesTable20260124180000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'expenses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'centerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'branchId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'PAID'",
          },
          {
            name: 'paymentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'paidAt',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdByProfileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updatedByProfileId',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_centerId',
        columnNames: ['centerId'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_branchId',
        columnNames: ['branchId'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_centerId_branchId',
        columnNames: ['centerId', 'branchId'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_centerId_status',
        columnNames: ['centerId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'expenses',
      new TableIndex({
        name: 'IDX_expenses_centerId_createdAt',
        columnNames: ['centerId', 'createdAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['centerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'centers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['branchId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'branches',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['paymentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['createdByProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['updatedByProfileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('expenses');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('expenses', fk);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('expenses', 'IDX_expenses_centerId_createdAt');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_createdAt');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_category');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_centerId_status');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_status');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_centerId_branchId');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_branchId');
    await queryRunner.dropIndex('expenses', 'IDX_expenses_centerId');

    // Drop table
    await queryRunner.dropTable('expenses');
  }
}
