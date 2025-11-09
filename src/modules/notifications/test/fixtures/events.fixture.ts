/**
 * Sample event data for testing
 */
export const testEvents = {
  /**
   * Center created event
   */
  centerCreated: {
    centerId: 'center-123',
    centerName: 'Test Center',
    creatorName: 'John Doe',
    ownerName: 'Jane Smith',
    createdAt: new Date().toISOString(),
  },

  /**
   * User created event
   */
  userCreated: {
    userId: 'user-123',
    userName: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
  },

  /**
   * OTP sent event
   */
  otpSent: {
    userId: 'user-123',
    otp: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  },

  /**
   * Password reset event
   */
  passwordReset: {
    userId: 'user-123',
    resetToken: 'reset-token-123',
    resetLink: 'https://example.com/reset?token=reset-token-123',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
};



