import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddIdempotencyKeyToStudentCharges20260127130356
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add idempotencyKey column
    await queryRunner.addColumn(
      'student_charges',
      new TableColumn({
        name: 'idempotencyKey',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add unique index on idempotencyKey (for idempotency checks)
    await queryRunner.createIndex(
      'student_charges',
      new TableIndex({
        name: 'IDX_student_charges_idempotencyKey',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex(
      'student_charges',
      'IDX_student_charges_idempotencyKey',
    );

    // Drop column
    await queryRunner.dropColumn('student_charges', 'idempotencyKey');
  }
}
