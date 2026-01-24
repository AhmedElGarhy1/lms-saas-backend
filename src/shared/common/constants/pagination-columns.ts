import {
  USER_SORTABLE_COLUMNS,
  CENTER_SORTABLE_COLUMNS,
  ROLE_SORTABLE_COLUMNS,
  PERMISSION_SORTABLE_COLUMNS,
  ACTIVITY_LOG_SORTABLE_COLUMNS,
  SESSION_SORTABLE_COLUMNS,
  CLASS_SORTABLE_COLUMNS,
  GROUP_SORTABLE_COLUMNS,
  STUDENT_BILLING_SORTABLE_COLUMNS,
  TEACHER_PAYOUT_SORTABLE_COLUMNS,
  PAYMENT_SORTABLE_COLUMNS,
  SUBJECT_SORTABLE_COLUMNS,
  LEVEL_SORTABLE_COLUMNS,
  BRANCH_SORTABLE_COLUMNS,
  ATTENDANCE_SORTABLE_COLUMNS,
  NOTIFICATION_SORTABLE_COLUMNS,
  EXPENSE_SORTABLE_COLUMNS,
} from './sortable-columns';

interface PaginationColumns {
  searchableColumns: string[];
  sortableColumns: string[];
  defaultSortBy: [string, 'ASC' | 'DESC'];
  dateRangeFields: string[];
}

/**
 * Shared pagination column constants for consistent pagination across the application
 */

// User module pagination columns
export const USER_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'phone', 'userProfiles.code'],
  sortableColumns: [...USER_SORTABLE_COLUMNS],
  dateRangeFields: ['createdAt', 'updatedAt'],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Center module pagination columns
export const CENTER_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'description'],
  sortableColumns: [...CENTER_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Role module pagination columns
export const ROLE_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'description'],
  sortableColumns: [...ROLE_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Permission module pagination columns
export const PERMISSION_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['action', 'description'],
  sortableColumns: [...PERMISSION_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Activity Log module pagination columns
export const ACTIVITY_LOG_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: [
    'action',
    'details',
    'actor.name',
    'actor.email',
    'center.name',
  ],
  sortableColumns: [...ACTIVITY_LOG_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Sessions module pagination columns
export const SESSION_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['title', 'group.name', 'class.name'],
  sortableColumns: [...SESSION_SORTABLE_COLUMNS],
  defaultSortBy: ['startTime', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['startTime', 'endTime'],
};

// Classes module pagination columns
export const CLASS_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'description'],
  sortableColumns: [...CLASS_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Groups module pagination columns
export const GROUP_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'class.name'],
  sortableColumns: [...GROUP_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Student Billing module pagination columns
export const STUDENT_BILLING_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: [],
  sortableColumns: [...STUDENT_BILLING_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Teacher Payouts module pagination columns
export const TEACHER_PAYOUT_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: [],
  sortableColumns: [...TEACHER_PAYOUT_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Finance/Payment module pagination columns
export const PAYMENT_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: [],
  sortableColumns: [...PAYMENT_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Subjects module pagination columns
export const SUBJECT_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'description'],
  sortableColumns: [...SUBJECT_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Levels module pagination columns
export const LEVEL_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name'],
  sortableColumns: [...LEVEL_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Branches module pagination columns
export const BRANCH_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['city', 'address'],
  sortableColumns: [...BRANCH_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Attendance module pagination columns
export const ATTENDANCE_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['fullName', 'studentCode'],
  sortableColumns: [...ATTENDANCE_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Notifications module pagination columns
export const NOTIFICATION_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['recipient'],
  sortableColumns: [...NOTIFICATION_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Expenses module pagination columns
export const EXPENSE_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['title', 'description'],
  sortableColumns: [...EXPENSE_SORTABLE_COLUMNS],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Common pagination options
export const COMMON_PAGINATION_OPTIONS = {
  defaultLimit: 10,
  maxLimit: 100,
};
