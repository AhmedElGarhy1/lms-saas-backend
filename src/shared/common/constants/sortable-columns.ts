/**
 * Sortable column definitions for pagination
 * Extracted for better maintainability and reusability
 */

// User Management
export const USER_SORTABLE_COLUMNS = [
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// Center Management
export const CENTER_SORTABLE_COLUMNS = [
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// Role Management
export const ROLE_SORTABLE_COLUMNS = [
  'name',
  'type',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// Permission Management
export const PERMISSION_SORTABLE_COLUMNS = [
  'action',
  'description',
  'isAdmin',
  'createdAt',
  'updatedAt',
] as const;

// Activity Log Management
export const ACTIVITY_LOG_SORTABLE_COLUMNS = [
  'createdAt',
  'updatedAt',
  'action',
  'level',
] as const;

// Session Management
export const SESSION_SORTABLE_COLUMNS = [
  'startTime',
  'endTime',
  'status',
  'createdAt',
  'updatedAt',
] as const;

// Class Management
export const CLASS_SORTABLE_COLUMNS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;

// Group Management
export const GROUP_SORTABLE_COLUMNS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;

// Student Billing
export const STUDENT_BILLING_SORTABLE_COLUMNS = [
  'createdAt',
  'amount',
  'chargeType',
  'updatedAt',
] as const;

// Teacher Payouts
export const TEACHER_PAYOUT_SORTABLE_COLUMNS = [
  'createdAt',
  'unitPrice',
  'unitCount',
  'status',
  'updatedAt',
] as const;

// Finance/Payment Management
export const PAYMENT_SORTABLE_COLUMNS = [
  'createdAt',
  'amount',
  'status',
  'updatedAt',
] as const;

// Subjects
export const SUBJECT_SORTABLE_COLUMNS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;

// Levels
export const LEVEL_SORTABLE_COLUMNS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;

// Branches
export const BRANCH_SORTABLE_COLUMNS = [
  'city',
  'createdAt',
  'updatedAt',
] as const;

// Attendance module pagination columns
export const ATTENDANCE_SORTABLE_COLUMNS = [
  'createdAt',
  'updatedAt',
  'status',
] as const;

// Notifications module pagination columns
export const NOTIFICATION_SORTABLE_COLUMNS = [
  'createdAt',
  'status',
  'channel',
  'type',
  'updatedAt',
] as const;

// Extended user search columns (when additional joins are available)
export const USER_EXTENDED_SEARCH_COLUMNS = [
  'name',
  'phone',
  'userProfiles.code',
] as const;