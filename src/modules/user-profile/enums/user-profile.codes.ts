/**
 * User Profile-related error codes (UPF_xxx)
 * Only codes actually used in the codebase
 */
export enum UserProfileErrorCode {
  USER_PROFILE_NOT_FOUND = 'UPF_001',
  USER_PROFILE_INVALID_DATA = 'UPF_009',
  USER_PROFILE_SELECTION_REQUIRED = 'UPF_011',
  USER_PROFILE_INACTIVE = 'UPF_012',
  USER_PROFILE_ALREADY_EXISTS = 'UPF_013',
  USER_PROFILE_ALREADY_EXISTS_WITH_CENTER_ACCESS = 'UPF_014',
}
