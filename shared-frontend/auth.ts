export enum AuthErrorCode 
  // Authentication
  AUTHENTICATION_FAILED = 'AUTH_001',
  INVALID_CREDENTIALS = 'AUTH_002',
  ACCOUNT_LOCKED = 'AUTH_003',
  ACCOUNT_DISABLED = 'AUTH_004',

  // Phone verification
  PHONE_NOT_VERIFIED = 'AUTH_008',
  OTP_REQUIRED = 'AUTH_009',
  OTP_INVALID = 'AUTH_010',
  OTP_EXPIRED = 'AUTH_011',

  // User management
  // USER_NOT_FOUND removed - use UserErrors.userNotFound() instead
  PASSWORD_RESET_REQUIRED = 'AUTH_017',
  PASSWORD_RESET_EXPIRED = 'AUTH_018',

  // Sessions
  SESSION_EXPIRED = 'AUTH_019',
  SESSION_INVALID = 'AUTH_020',

  // Tokens
  REFRESH_TOKEN_INVALID = 'AUTH_022',
  REFRESH_TOKEN_EXPIRED = 'AUTH_023',
  REFRESH_TOKEN_NOT_FOUND = 'AUTH_031',

  PROFILE_SELECTION_REQUIRED = 'AUTH_025',

  // Two-factor authentication specific errors
  TWO_FACTOR_NOT_ENABLED = 'AUTH_026', // Trying to use 2FA when not set up
  TWO_FACTOR_ALREADY_ENABLED = 'AUTH_027', // Trying to setup 2FA when already enabled
  TWO_FACTOR_ALREADY_SETUP = 'AUTH_028', // Trying to setup 2FA when already exists

  // WebSocket authentication errors
  WEBSOCKET_NO_TOKEN = 'AUTH_033', // No token provided for WebSocket
  WEBSOCKET_INVALID_TOKEN_TYPE = 'AUTH_034', // Invalid token type for WebSocket

  // Validation errors
  MISSING_USER_IDENTIFIER = 'AUTH_029', // Missing userId or phone in request
  MISSING_PHONE_PARAMETER = 'AUTH_030', // Missing phone parameter
  AUTHENTICATION_REQUIRED = 'AUTH_032', // User authentication required
