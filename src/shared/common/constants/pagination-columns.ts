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
  sortableColumns: [
    'name',
    'isActive',
    'createdAt',
    'updatedAt',
    'roleId',
    'centerId',
  ],
  dateRangeFields: ['createdAt', 'updatedAt'],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Center module pagination columns
export const CENTER_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['name', 'description'],
  sortableColumns: [
    'name',
    'description',
    'isActive',
    'createdAt',
    'updatedAt',
  ],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Role module pagination columns
export const ROLE_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['role.name', 'role.description'],
  sortableColumns: [
    'role.name',
    'role.description',
    'role.type',
    'role.isActive',
    'role.createdAt',
    'role.updatedAt',
  ],
  defaultSortBy: ['role.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Permission module pagination columns
export const PERMISSION_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: ['permission.action', 'permission.description'],
  sortableColumns: [
    'permission.action',
    'permission.description',
    'permission.isAdmin',
    'permission.createdAt',
    'permission.updatedAt',
  ],
  defaultSortBy: ['permission.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Activity Log module pagination columns
export const ACTIVITY_LOG_PAGINATION_COLUMNS: PaginationColumns = {
  searchableColumns: [
    'activityLog.action',
    'activityLog.details',
    'actor.name',
    'actor.email',
    'center.name',
  ],

  sortableColumns: [
    'activityLog.createdAt',
    'activityLog.updatedAt',
    'activityLog.action',
    'activityLog.level',
  ],
  defaultSortBy: ['activityLog.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
  dateRangeFields: ['createdAt', 'updatedAt'],
};

// Common pagination options
export const COMMON_PAGINATION_OPTIONS = {
  defaultLimit: 10,
  maxLimit: 100,
};
