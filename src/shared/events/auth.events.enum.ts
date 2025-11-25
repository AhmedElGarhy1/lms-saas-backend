export enum AuthEvents {
  USER_LOGGED_IN = 'user.logged.in',
  USER_LOGGED_OUT = 'user.logged.out',
  USER_LOGIN_FAILED = 'user.login.failed',
  TOKEN_REFRESHED = 'token.refreshed',
  PASSWORD_CHANGED = 'password.changed',
  PHONE_VERIFIED = 'phone.verified',
  PASSWORD_RESET_REQUESTED = 'password.reset.requested',
  PHONE_VERIFICATION_SEND_REQUESTED = 'phone.verification.send.requested', // New: Request to send phone verification
  OTP = 'auth.otp.sent',
  TWO_FA_SETUP = 'two.fa.setup',
  TWO_FA_ENABLED = 'two.fa.enabled',
  TWO_FA_DISABLED = 'two.fa.disabled',
}
