import { z } from 'zod';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Validation schema for RecipientInfo
 * Ensures all recipient data is valid before processing notifications
 */
export const RecipientInfoSchema = z
  .object({
    userId: z.string().uuid('Invalid userId format - must be a valid UUID'),
    profileId: z
      .string()
      .uuid('Invalid profileId format - must be a valid UUID')
      .nullable()
      .optional(),
    profileType: z
      .nativeEnum(ProfileType, {
        errorMap: () => ({ message: 'Invalid profileType' }),
      })
      .nullable()
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .nullable()
      .optional()
      .or(z.literal(null)),
    phone: z
      .string()
      .regex(
        /^\+?[1-9]\d{1,14}$/,
        'Invalid phone format - must be E164 format (e.g., +1234567890)',
      )
      .min(1, 'Phone number is required'),
    locale: z
      .string()
      .length(2, 'Locale must be exactly 2 characters (e.g., en, ar)')
      .default('en'),
    centerId: z
      .string()
      .uuid('Invalid centerId format - must be a valid UUID')
      .nullable()
      .optional()
      .or(z.literal(null)),
  })
  .refine(
    (data) => data.email || data.phone,
    {
      message: 'Either email or phone must be provided',
      path: ['email'], // Error will be attached to email field
    },
  );

/**
 * Type-safe RecipientInfo after validation
 */
export type ValidatedRecipientInfo = z.infer<typeof RecipientInfoSchema>;

/**
 * Validate a single recipient
 * @throws {z.ZodError} if validation fails
 */
export function validateRecipientInfo(
  recipient: unknown,
): ValidatedRecipientInfo {
  return RecipientInfoSchema.parse(recipient);
}

/**
 * Validate multiple recipients
 * Returns validated recipients and errors
 */
export function validateRecipients(
  recipients: unknown[],
): {
  valid: ValidatedRecipientInfo[];
  errors: Array<{ index: number; errors: z.ZodError }>;
} {
  const valid: ValidatedRecipientInfo[] = [];
  const errors: Array<{ index: number; errors: z.ZodError }> = [];

  recipients.forEach((recipient, index) => {
    const result = RecipientInfoSchema.safeParse(recipient);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({ index, errors: result.error });
    }
  });

  return { valid, errors };
}


