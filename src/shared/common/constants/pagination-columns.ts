/**
 * Shared pagination column constants for consistent pagination across the application
 */

// User module pagination columns
export const USER_PAGINATION_COLUMNS = {
  searchableColumns: ['name', 'email'],
  sortableColumns: [
    'name',
    'email',
    'isActive',
    'createdAt',
    'updatedAt',
    'roleId',
  ],
  dateRangeFields: ['createdAt', 'updatedAt'],
  defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Center module pagination columns
export const CENTER_PAGINATION_COLUMNS = {
  searchableColumns: ['center.name', 'center.description'],
  filterableColumns: ['center.isActive', 'center.id'],
  sortableColumns: [
    'center.name',
    'center.description',
    'center.isActive',
    'center.createdAt',
    'center.updatedAt',
  ],
  defaultSortBy: ['center.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Role module pagination columns
export const ROLE_PAGINATION_COLUMNS = {
  searchableColumns: ['role.name', 'role.description'],
  filterableColumns: ['role.type', 'role.isActive', 'role.id'],
  sortableColumns: [
    'role.name',
    'role.description',
    'role.type',
    'role.isActive',
    'role.createdAt',
    'role.updatedAt',
  ],
  defaultSortBy: ['role.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Permission module pagination columns
export const PERMISSION_PAGINATION_COLUMNS = {
  searchableColumns: ['permission.action', 'permission.description'],
  filterableColumns: ['permission.isAdmin', 'permission.id'],
  sortableColumns: [
    'permission.action',
    'permission.description',
    'permission.isAdmin',
    'permission.createdAt',
    'permission.updatedAt',
  ],
  defaultSortBy: ['permission.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Activity Log module pagination columns
export const ACTIVITY_LOG_PAGINATION_COLUMNS = {
  searchableColumns: [
    'activityLog.action',
    'activityLog.details',
    'actor.name',
    'actor.email',
    'center.name',
  ],
  filterableColumns: [
    'activityLog.centerId',
    'activityLog.actorId',
    'activityLog.type',
    'activityLog.level',
    'activityLog.id',
  ],
  sortableColumns: [
    'activityLog.createdAt',
    'activityLog.updatedAt',
    'activityLog.action',
    'activityLog.level',
  ],
  defaultSortBy: ['activityLog.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Group module pagination columns
export const GROUP_PAGINATION_COLUMNS = {
  searchableColumns: ['group.name', 'group.description'],
  filterableColumns: ['group.centerId', 'group.isActive', 'group.id'],
  sortableColumns: [
    'group.name',
    'group.description',
    'group.isActive',
    'group.createdAt',
    'group.updatedAt',
  ],
  defaultSortBy: ['group.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Subject module pagination columns
export const SUBJECT_PAGINATION_COLUMNS = {
  searchableColumns: ['subject.name', 'subject.description'],
  filterableColumns: ['subject.gradeLevelId', 'subject.isActive', 'subject.id'],
  sortableColumns: [
    'subject.name',
    'subject.description',
    'subject.isActive',
    'subject.createdAt',
    'subject.updatedAt',
  ],
  defaultSortBy: ['subject.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Session module pagination columns
export const SESSION_PAGINATION_COLUMNS = {
  searchableColumns: ['session.title', 'session.description'],
  filterableColumns: [
    'session.groupId',
    'session.subjectId',
    'session.isActive',
    'session.id',
  ],
  sortableColumns: [
    'session.title',
    'session.description',
    'session.startTime',
    'session.endTime',
    'session.isActive',
    'session.createdAt',
    'session.updatedAt',
  ],
  defaultSortBy: ['session.startTime', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Attendance module pagination columns
export const ATTENDANCE_PAGINATION_COLUMNS = {
  searchableColumns: ['attendance.notes'],
  filterableColumns: [
    'attendance.sessionId',
    'attendance.studentId',
    'attendance.status',
    'attendance.id',
  ],
  sortableColumns: [
    'attendance.date',
    'attendance.status',
    'attendance.createdAt',
    'attendance.updatedAt',
  ],
  defaultSortBy: ['attendance.date', 'DESC'] as [string, 'ASC' | 'DESC'],
};

// Grade Level module pagination columns
export const GRADE_LEVEL_PAGINATION_COLUMNS = {
  searchableColumns: ['gradeLevel.name', 'gradeLevel.description'],
  filterableColumns: ['gradeLevel.isActive', 'gradeLevel.id'],
  sortableColumns: [
    'gradeLevel.name',
    'gradeLevel.description',
    'gradeLevel.level',
    'gradeLevel.isActive',
    'gradeLevel.createdAt',
    'gradeLevel.updatedAt',
  ],
  defaultSortBy: ['gradeLevel.level', 'ASC'] as [string, 'ASC' | 'DESC'],
};

// Common pagination options
export const COMMON_PAGINATION_OPTIONS = {
  defaultLimit: 10,
  maxLimit: 100,
};
