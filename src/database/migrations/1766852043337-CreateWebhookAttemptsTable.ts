import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookAttemptsTable1766852043337
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "webhook_attempts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdBy" uuid,
                "updatedBy" uuid,
                "provider" varchar(20) NOT NULL,
                "externalId" varchar(255) NOT NULL,
                "status" varchar(20) NOT NULL DEFAULT 'RECEIVED',
                "payload" jsonb NOT NULL,
                "signature" varchar(255),
                "ipAddress" varchar(45),
                "attemptCount" int NOT NULL DEFAULT 1,
                "nextRetryAt" TIMESTAMP,
                "processedAt" TIMESTAMP,
                "errorMessage" text,
                "processingResult" jsonb,
                CONSTRAINT "PK_webhook_attempts" PRIMARY KEY ("id")
            )
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_webhook_attempts_provider_external_id"
            ON "webhook_attempts" ("provider", "externalId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_webhook_attempts_status"
            ON "webhook_attempts" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_webhook_attempts_next_retry_at"
            ON "webhook_attempts" ("nextRetryAt")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_webhook_attempts_created_at"
            ON "webhook_attempts" ("createdAt")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webhook_attempts"`);
  }
}
