import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInstallmentToStudentCharges1768045826011 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL doesn't allow direct enum alterations, so we need to:
        // 1. Rename the existing enum
        // 2. Create a new enum with INSTALLMENT added
        // 3. Update the column to use the new enum
        // 4. Drop the old enum
        // 5. Add new columns

        // Rename existing enum
        await queryRunner.query(`
            ALTER TYPE student_charges_status_enum
            RENAME TO student_charges_status_enum_old
        `);

        // Create new enum with INSTALLMENT added
        await queryRunner.query(`
            CREATE TYPE student_charges_status_enum AS ENUM('PENDING', 'INSTALLMENT', 'COMPLETED', 'REFUNDED', 'CANCELLED')
        `);

        // Update the column to use the new enum
        await queryRunner.query(`
            ALTER TABLE student_charges
            ALTER COLUMN status TYPE student_charges_status_enum
            USING status::text::student_charges_status_enum
        `);

        // Drop the old enum
        await queryRunner.query(`
            DROP TYPE student_charges_status_enum_old
        `);

        // Add new columns for installment tracking
        await queryRunner.query(`
            ALTER TABLE student_charges
            ADD COLUMN total_paid DECIMAL(10,2) DEFAULT 0 NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE student_charges
            ADD COLUMN last_payment_amount DECIMAL(10,2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the migration: remove INSTALLMENT from the enum and remove columns

        // Remove new columns
        await queryRunner.query(`
            ALTER TABLE student_charges
            DROP COLUMN last_payment_amount
        `);

        await queryRunner.query(`
            ALTER TABLE student_charges
            DROP COLUMN total_paid
        `);

        // Rename existing enum
        await queryRunner.query(`
            ALTER TYPE student_charges_status_enum
            RENAME TO student_charges_status_enum_old
        `);

        // Create new enum without INSTALLMENT
        await queryRunner.query(`
            CREATE TYPE student_charges_status_enum AS ENUM('PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED')
        `);

        // Update the column to use the new enum (convert INSTALLMENT back to PENDING)
        await queryRunner.query(`
            ALTER TABLE student_charges
            ALTER COLUMN status TYPE student_charges_status_enum
            USING CASE
                WHEN status::text = 'INSTALLMENT' THEN 'PENDING'::student_charges_status_enum
                ELSE status::text::student_charges_status_enum
            END
        `);

        // Drop the old enum
        await queryRunner.query(`
            DROP TYPE student_charges_status_enum_old
        `);
    }

}
