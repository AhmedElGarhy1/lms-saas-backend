import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add unique index on WhatsApp message ID for efficient webhook correlation
 * Creates a partial unique index on (metadata->>'whatsappMessageId', channel) for WhatsApp logs
 */
export class AddWhatsAppMessageIdIndex1764000000000
  implements MigrationInterface
{
  name = 'AddWhatsAppMessageIdIndex1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create unique index on WhatsApp message ID for efficient webhook correlation
    // Partial index (WHERE clause) only indexes WhatsApp logs with message IDs
    // This improves lookup performance for findByWhatsAppMessageId()
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_whatsapp_message_id 
      ON notification_logs ((metadata->>'whatsappMessageId'), channel) 
      WHERE channel = 'WHATSAPP' AND metadata->>'whatsappMessageId' IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_logs_whatsapp_message_id;
    `);
  }
}
