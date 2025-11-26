export enum VerificationType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  OTP_VERIFICATION = 'OTP_VERIFICATION', // General phone verification
  TWO_FACTOR_AUTH = 'TWO_FACTOR_AUTH', // 2FA setup/enable/disable
  LOGIN_OTP = 'LOGIN_OTP', // OTP for login with 2FA
  IMPORT_USER_OTP = 'IMPORT_USER_OTP', // OTP for user import
}
