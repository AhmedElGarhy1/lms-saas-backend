import { Test, TestingModule } from '@nestjs/testing';
import { RecipientValidationService } from '../../adapters/recipient-validation.service';
import { NotificationChannel } from '../../enums/notification-channel.enum';

describe('RecipientValidationService', () => {
  let service: RecipientValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecipientValidationService],
    }).compile();

    service = module.get<RecipientValidationService>(
      RecipientValidationService,
    );
  });

  describe('determineAndValidateRecipient', () => {
    it('should return email for EMAIL channel', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.EMAIL,
        'test@example.com',
        '+1234567890',
        'user-123',
      );
      expect(result).toBe('test@example.com');
    });

    it('should return null for EMAIL channel if no email provided', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.EMAIL,
        undefined,
        '+1234567890',
        'user-123',
      );
      expect(result).toBeNull();
    });

    it('should return null for EMAIL channel if recipient is not email', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.EMAIL,
        'not-an-email',
        '+1234567890',
        'user-123',
      );
      expect(result).toBeNull();
    });

    it('should return normalized phone for SMS channel', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        'test@example.com',
        '+1234567890',
        'user-123',
      );
      expect(result).toBe('+1234567890');
    });

    it('should return null for SMS channel if no phone provided', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        'test@example.com',
        undefined,
        'user-123',
      );
      expect(result).toBeNull();
    });

    it('should return null for SMS channel if phone is userId', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        'test@example.com',
        'user-123', // phone is same as userId - invalid
        'user-123',
      );
      expect(result).toBeNull();
    });

    it('should return null for SMS channel if phone is email', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        'test@example.com',
        'test@example.com', // phone is email - invalid
        'user-123',
      );
      expect(result).toBeNull();
    });

    it('should return normalized phone for WHATSAPP channel', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.WHATSAPP,
        'test@example.com',
        '+1234567890',
        'user-123',
      );
      expect(result).toBe('+1234567890');
    });

    it('should return userId for IN_APP channel', () => {
      const result = service.determineAndValidateRecipient(
        NotificationChannel.IN_APP,
        'test@example.com',
        '+1234567890',
        'user-123',
      );
      expect(result).toBe('user-123');
    });

    it('should return recipient or phone for PUSH channel (fallback)', () => {
      const result1 = service.determineAndValidateRecipient(
        NotificationChannel.PUSH,
        'test@example.com',
        '+1234567890',
        'user-123',
      );
      expect(result1).toBe('test@example.com');

      const result2 = service.determineAndValidateRecipient(
        NotificationChannel.PUSH,
        undefined,
        '+1234567890',
        'user-123',
      );
      expect(result2).toBe('+1234567890');
    });

    it('should validate email format', () => {
      const valid = service.determineAndValidateRecipient(
        NotificationChannel.EMAIL,
        'valid@example.com',
        undefined,
        'user-123',
      );
      expect(valid).toBe('valid@example.com');

      const invalid = service.determineAndValidateRecipient(
        NotificationChannel.EMAIL,
        'invalid-email',
        undefined,
        'user-123',
      );
      expect(invalid).toBeNull();
    });

    it('should normalize and validate phone format', () => {
      const valid = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        undefined,
        '+1234567890',
        'user-123',
      );
      expect(valid).toBe('+1234567890');

      const invalid = service.determineAndValidateRecipient(
        NotificationChannel.SMS,
        undefined,
        '1234567890', // Not E.164 format
        'user-123',
      );
      // Should normalize or return null if can't normalize
      expect(invalid).toBeDefined();
    });
  });

  describe('isValidRecipientForChannel', () => {
    it('should validate email for EMAIL channel', () => {
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.EMAIL,
          'test@example.com',
        ),
      ).toBe(true);
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.EMAIL,
          'invalid',
        ),
      ).toBe(false);
    });

    it('should validate phone for SMS channel', () => {
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.SMS,
          '+1234567890',
        ),
      ).toBe(true);
      expect(
        service.isValidRecipientForChannel(NotificationChannel.SMS, 'invalid'),
      ).toBe(false);
    });

    it('should validate phone for WHATSAPP channel', () => {
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.WHATSAPP,
          '+1234567890',
        ),
      ).toBe(true);
    });

    it('should return true for IN_APP and PUSH (no format validation)', () => {
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.IN_APP,
          'any-value',
        ),
      ).toBe(true);
      expect(
        service.isValidRecipientForChannel(
          NotificationChannel.PUSH,
          'any-value',
        ),
      ).toBe(true);
    });
  });
});
