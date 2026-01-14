import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePaymentFieldsForClarity1768429400406
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {}

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
