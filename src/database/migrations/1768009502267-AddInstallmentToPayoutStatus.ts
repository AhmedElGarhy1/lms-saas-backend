import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstallmentToPayoutStatus1768009502267
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't allow direct enum alterations, so we need to:
    // 1. Rename the existing enum
    // 2. Create a new enum with INSTALLMENT added
    // 3. Update the column to use the new enum
    // 4. Drop the old enum

    // Rename existing enum
    await queryRunner.query(`
            ALTER TYPE teacher_payout_records_status_enum
            RENAME TO teacher_payout_records_status_enum_old
        `);

    // Create new enum with INSTALLMENT added
    await queryRunner.query(`
            CREATE TYPE teacher_payout_records_status_enum AS ENUM('PENDING', 'INSTALLMENT', 'PAID')
        `);

    // Update the column to use the new enum
    await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            ALTER COLUMN status TYPE teacher_payout_records_status_enum
            USING status::text::teacher_payout_records_status_enum
        `);

    // Drop the old enum
    await queryRunner.query(`
            DROP TYPE teacher_payout_records_status_enum_old
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the migration: remove INSTALLMENT from the enum

    // Rename existing enum
    await queryRunner.query(`
            ALTER TYPE teacher_payout_records_status_enum
            RENAME TO teacher_payout_records_status_enum_old
        `);

    // Create new enum without INSTALLMENT
    await queryRunner.query(`
            CREATE TYPE teacher_payout_records_status_enum AS ENUM('PENDING', 'PAID')
        `);

    // Update the column to use the new enum (convert INSTALLMENT back to PENDING)
    await queryRunner.query(`
            ALTER TABLE teacher_payout_records
            ALTER COLUMN status TYPE teacher_payout_records_status_enum
            USING CASE
                WHEN status::text = 'INSTALLMENT' THEN 'PENDING'::teacher_payout_records_status_enum
                ELSE status::text::teacher_payout_records_status_enum
            END
        `);

    // Drop the old enum
    await queryRunner.query(`
            DROP TYPE teacher_payout_records_status_enum_old
        `);
  }
}
