import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentStatusChangesTable1766853127328
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_status_changes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedBy" uuid,
        "paymentId" uuid NOT NULL,
        "oldStatus" varchar(20) NOT NULL,
        "newStatus" varchar(20) NOT NULL,
        "transitionType" varchar(20) NOT NULL,
        "changedByUserId" uuid NOT NULL,
        "reason" text,
        "metadata" jsonb,
        CONSTRAINT "PK_payment_status_changes" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_status_changes_payment_id"
      ON "payment_status_changes" ("paymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_status_changes_changed_by_user_id"
      ON "payment_status_changes" ("changedByUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_status_changes_created_at"
      ON "payment_status_changes" ("createdAt")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "payment_status_changes"
      ADD CONSTRAINT "FK_payment_status_changes_payment"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_status_changes"
      ADD CONSTRAINT "FK_payment_status_changes_user"
      FOREIGN KEY ("changedByUserId") REFERENCES "user_profiles"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_status_changes"`);
  }
}
