import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAbsenteePolicyToClasses1766937274000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add absenteePolicy column to classes table
    await queryRunner.addColumn(
      'classes',
      new TableColumn({
        name: 'absenteePolicy',
        type: 'varchar',
        length: '20',
        default: "'FLEXIBLE'", // Default to student-friendly policy
        comment: 'Payment policy for absent students: STRICT (auto-pay), FLEXIBLE (pay-on-attend), MANUAL (admin decides)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove absenteePolicy column from classes table
    await queryRunner.dropColumn('classes', 'absenteePolicy');
  }
}
