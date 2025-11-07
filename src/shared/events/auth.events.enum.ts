export enum AuthEvents {
  USER_LOGGED_IN = 'user.logged.in',
  USER_LOGGED_OUT = 'user.logged.out',
  TOKEN_REFRESHED = 'token.refreshed',
  PASSWORD_CHANGED = 'password.changed',
  EMAIL_VERIFIED = 'email.verified',
  PASSWORD_RESET_REQUESTED = 'password.reset.requested',
  EMAIL_VERIFICATION_REQUESTED = 'email.verification.requested',
  OTP = 'auth.otp.sent',
  TWO_FA_SETUP = 'two.fa.setup',
  TWO_FA_ENABLED = 'two.fa.enabled',
  TWO_FA_DISABLED = 'two.fa.disabled',
}
