import { Test, TestingModule } from '@nestjs/testing';
import { MultiRecipientProcessor } from './multi-recipient-processor.service';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationConfig } from '../config/notification.config';

describe('MultiRecipientProcessor', () => {
  let service: MultiRecipientProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MultiRecipientProcessor],
    }).compile();

    service = module.get<MultiRecipientProcessor>(MultiRecipientProcessor);
  });

  describe('processRecipients', () => {
    it('should process empty array', async () => {
      const results = await service.processRecipients([], async () => 'result');
      expect(results).toEqual([]);
    });

    it('should process single recipient', async () => {
      const recipient: RecipientInfo = {
        userId: 'user-1',
        email: 'test@example.com',
      };

      const results = await service.processRecipients(
        [recipient],
        async (r) => `processed-${r.userId}`,
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('processed-user-1');
      expect(results[0].recipient).toEqual(recipient);
    });

    it('should process multiple recipients with concurrency control', async () => {
      const recipients: RecipientInfo[] = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        email: `user${i}@example.com`,
      }));

      const results = await service.processRecipients(
        recipients,
        async (r) => {
          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `processed-${r.userId}`;
        },
      );

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.map((r) => r.result)).toEqual([
        'processed-user-0',
        'processed-user-1',
        'processed-user-2',
        'processed-user-3',
        'processed-user-4',
      ]);
    });

    it('should handle errors gracefully', async () => {
      const recipients: RecipientInfo[] = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
        { userId: 'user-3', email: 'user3@example.com' },
      ];

      const results = await service.processRecipients(
        recipients,
        async (r) => {
          if (r.userId === 'user-2') {
            throw new Error('Processing failed');
          }
          return `processed-${r.userId}`;
        },
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].result).toBeInstanceOf(Error);
      expect((results[1].result as Error).message).toBe('Processing failed');
      expect(results[2].success).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      const concurrencyLimit = NotificationConfig.concurrency.maxRecipientsPerBatch;
      const recipients: RecipientInfo[] = Array.from(
        { length: concurrencyLimit * 2 },
        (_, i) => ({
          userId: `user-${i}`,
          email: `user${i}@example.com`,
        }),
      );

      let concurrentCount = 0;
      let maxConcurrent = 0;

      await service.processRecipients(recipients, async (r) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 50));

        concurrentCount--;
        return `processed-${r.userId}`;
      });

      // Should not exceed concurrency limit
      expect(maxConcurrent).toBeLessThanOrEqual(concurrencyLimit);
    });
  });

  describe('processRecipientsInBatches', () => {
    it('should process recipients in batches', async () => {
      const recipients: RecipientInfo[] = Array.from({ length: 25 }, (_, i) => ({
        userId: `user-${i}`,
        email: `user${i}@example.com`,
      }));

      const batchSize = 10;
      const results = await service.processRecipientsInBatches(
        recipients,
        async (r) => `processed-${r.userId}`,
        batchSize,
      );

      expect(results).toHaveLength(25);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await service.processRecipientsInBatches(
        [],
        async () => 'result',
        10,
      );
      expect(results).toEqual([]);
    });
  });

  describe('getProcessingStats', () => {
    it('should calculate correct statistics', () => {
      const results = [
        { recipient: { userId: '1' } as RecipientInfo, result: 'success', success: true },
        { recipient: { userId: '2' } as RecipientInfo, result: 'success', success: true },
        { recipient: { userId: '3' } as RecipientInfo, result: new Error('fail'), success: false },
      ];

      const stats = service.getProcessingStats(results);

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('should handle empty results', () => {
      const stats = service.getProcessingStats([]);
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate 100% success rate', () => {
      const results = [
        { recipient: { userId: '1' } as RecipientInfo, result: 'success', success: true },
        { recipient: { userId: '2' } as RecipientInfo, result: 'success', success: true },
      ];

      const stats = service.getProcessingStats(results);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('getConcurrencyLimit', () => {
    it('should return configured concurrency limit', () => {
      const limit = service.getConcurrencyLimit();
      expect(limit).toBe(NotificationConfig.concurrency.maxRecipientsPerBatch);
      expect(limit).toBeGreaterThan(0);
    });
  });
});

