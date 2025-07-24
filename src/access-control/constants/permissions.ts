export const PERMISSIONS = {
  // User Management
  USER: {
    VIEW: { action: 'user:view', name: 'View Users' },
    CREATE: { action: 'user:create', name: 'Create Users' },
    UPDATE: { action: 'user:update', name: 'Update Users' },
    DELETE: { action: 'user:delete', name: 'Delete Users' },
    INVITE: { action: 'user:invite', name: 'Invite Users' },
    ASSIGN_ROLE: { action: 'user:assign-role', name: 'Assign Roles to Users' },
  },

  // Center Management
  CENTER: {
    VIEW: { action: 'center:view', name: 'View Centers' },
    CREATE: { action: 'center:create', name: 'Create Centers' },
    UPDATE: { action: 'center:update', name: 'Update Centers' },
    DELETE: { action: 'center:delete', name: 'Delete Centers' },
    MANAGE: { action: 'center:manage', name: 'Manage Centers' },
    MANAGE_MEMBERS: {
      action: 'center:manage-members',
      name: 'Manage Center Members',
    },
  },

  // Student Management
  STUDENT: {
    VIEW: { action: 'student:view', name: 'View Students' },
    CREATE: { action: 'student:create', name: 'Create Students' },
    UPDATE: { action: 'student:update', name: 'Update Students' },
    DELETE: { action: 'student:delete', name: 'Delete Students' },
    ASSIGN_GROUP: {
      action: 'student:assign-group',
      name: 'Assign Students to Groups',
    },
    ASSIGN_GRADE_LEVEL: {
      action: 'student:assign-grade-level',
      name: 'Assign Students to Grade Levels',
    },
  },

  // Teacher Management
  TEACHER: {
    VIEW: { action: 'teacher:view', name: 'View Teachers' },
    CREATE: { action: 'teacher:create', name: 'Create Teachers' },
    UPDATE: { action: 'teacher:update', name: 'Update Teachers' },
    DELETE: { action: 'teacher:delete', name: 'Delete Teachers' },
    ASSIGN_SUBJECT: {
      action: 'teacher:assign-subject',
      name: 'Assign Teachers to Subjects',
    },
    ASSIGN_GROUP: {
      action: 'teacher:assign-group',
      name: 'Assign Teachers to Groups',
    },
  },

  // Guardian Management
  GUARDIAN: {
    VIEW: { action: 'guardian:view', name: 'View Guardians' },
    CREATE: { action: 'guardian:create', name: 'Create Guardians' },
    UPDATE: { action: 'guardian:update', name: 'Update Guardians' },
    DELETE: { action: 'guardian:delete', name: 'Delete Guardians' },
    ASSIGN: { action: 'guardian:assign', name: 'Assign Guardians to Students' },
  },

  // Schedule Management
  SCHEDULE: {
    VIEW: { action: 'schedule:view', name: 'View Schedules' },
    CREATE: { action: 'schedule:create', name: 'Create Schedules' },
    UPDATE: { action: 'schedule:update', name: 'Update Schedules' },
    DELETE: { action: 'schedule:delete', name: 'Delete Schedules' },
    MANAGE_RECURRENCE: {
      action: 'schedule:manage-recurrence',
      name: 'Manage Schedule Recurrence',
    },
  },

  // Attendance Management
  ATTENDANCE: {
    VIEW: { action: 'attendance:view', name: 'View Attendance' },
    MARK: { action: 'attendance:mark', name: 'Mark Attendance' },
    UPDATE: { action: 'attendance:update', name: 'Update Attendance' },
    DELETE: { action: 'attendance:delete', name: 'Delete Attendance' },
    REPORT: {
      action: 'attendance:report',
      name: 'Generate Attendance Reports',
    },
    BULK_MARK: { action: 'attendance:bulk-mark', name: 'Bulk Mark Attendance' },
  },

  // Group Management
  GROUP: {
    VIEW: { action: 'group:view', name: 'View Groups' },
    CREATE: { action: 'group:create', name: 'Create Groups' },
    UPDATE: { action: 'group:update', name: 'Update Groups' },
    DELETE: { action: 'group:delete', name: 'Delete Groups' },
    MANAGE_STUDENTS: {
      action: 'group:manage-students',
      name: 'Manage Group Students',
    },
    MANAGE_TEACHERS: {
      action: 'group:manage-teachers',
      name: 'Manage Group Teachers',
    },
  },

  // Subject Management
  SUBJECT: {
    VIEW: { action: 'subject:view', name: 'View Subjects' },
    CREATE: { action: 'subject:create', name: 'Create Subjects' },
    UPDATE: { action: 'subject:update', name: 'Update Subjects' },
    DELETE: { action: 'subject:delete', name: 'Delete Subjects' },
    MANAGE_TEACHERS: {
      action: 'subject:manage-teachers',
      name: 'Manage Subject Teachers',
    },
  },

  // Grade Level Management
  GRADE_LEVEL: {
    VIEW: { action: 'grade-level:view', name: 'View Grade Levels' },
    CREATE: { action: 'grade-level:create', name: 'Create Grade Levels' },
    UPDATE: { action: 'grade-level:update', name: 'Update Grade Levels' },
    DELETE: { action: 'grade-level:delete', name: 'Delete Grade Levels' },
    MANAGE_STUDENTS: {
      action: 'grade-level:manage-students',
      name: 'Manage Grade Level Students',
    },
    MANAGE_GROUPS: {
      action: 'grade-level:manage-groups',
      name: 'Manage Grade Level Groups',
    },
    MANAGE_SUBJECTS: {
      action: 'grade-level:manage-subjects',
      name: 'Manage Grade Level Subjects',
    },
  },

  // Payment Management
  PAYMENT: {
    VIEW: { action: 'payment:view', name: 'View Payments' },
    CREATE: { action: 'payment:create', name: 'Create Payments' },
    UPDATE: { action: 'payment:update', name: 'Update Payments' },
    DELETE: { action: 'payment:delete', name: 'Delete Payments' },
    PROCESS: { action: 'payment:process', name: 'Process Payments' },
    REFUND: { action: 'payment:refund', name: 'Refund Payments' },
  },

  // Support Management
  SUPPORT: {
    VIEW: { action: 'support:view', name: 'View Support Tickets' },
    HANDLE: { action: 'support:handle', name: 'Handle Support Tickets' },
    ESCALATE: { action: 'support:escalate', name: 'Escalate Support Tickets' },
    CLOSE: { action: 'support:close', name: 'Close Support Tickets' },
  },

  // Access Control Management
  ACCESS_CONTROL: {
    VIEW_ROLES: { action: 'access-control:view-roles', name: 'View Roles' },
    CREATE_ROLE: { action: 'access-control:create-role', name: 'Create Roles' },
    UPDATE_ROLE: { action: 'access-control:update-role', name: 'Update Roles' },
    DELETE_ROLE: { action: 'access-control:delete-role', name: 'Delete Roles' },
    ASSIGN_ROLE: { action: 'access-control:assign-role', name: 'Assign Roles' },
    VIEW_PERMISSIONS: {
      action: 'access-control:view-permissions',
      name: 'View Permissions',
    },
    ASSIGN_PERMISSION: {
      action: 'access-control:assign-permission',
      name: 'Assign Permissions',
    },
  },

  // System Management
  SYSTEM: {
    VIEW_LOGS: { action: 'system:view-logs', name: 'View System Logs' },
    MANAGE_SETTINGS: {
      action: 'system:manage-settings',
      name: 'Manage System Settings',
    },
    BACKUP: { action: 'system:backup', name: 'Create System Backups' },
    RESTORE: { action: 'system:restore', name: 'Restore System Backups' },
  },
};

// Center-level user permissions (isAdmin: false)
export const ALL_USER_PERMISSIONS = [
  // User Management
  {
    action: PERMISSIONS.USER.VIEW.action,
    name: PERMISSIONS.USER.VIEW.name,
    isAdmin: false,
  },

  // Center Management
  {
    action: PERMISSIONS.CENTER.VIEW.action,
    name: PERMISSIONS.CENTER.VIEW.name,
    isAdmin: false,
  },

  // Student Management
  {
    action: PERMISSIONS.STUDENT.VIEW.action,
    name: PERMISSIONS.STUDENT.VIEW.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.STUDENT.CREATE.action,
    name: PERMISSIONS.STUDENT.CREATE.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.STUDENT.UPDATE.action,
    name: PERMISSIONS.STUDENT.UPDATE.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.STUDENT.ASSIGN_GROUP.action,
    name: PERMISSIONS.STUDENT.ASSIGN_GROUP.name,
    isAdmin: false,
  },

  // Teacher Management
  {
    action: PERMISSIONS.TEACHER.VIEW.action,
    name: PERMISSIONS.TEACHER.VIEW.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.TEACHER.UPDATE.action,
    name: PERMISSIONS.TEACHER.UPDATE.name,
    isAdmin: false,
  },

  // Schedule Management
  {
    action: PERMISSIONS.SCHEDULE.VIEW.action,
    name: PERMISSIONS.SCHEDULE.VIEW.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.SCHEDULE.CREATE.action,
    name: PERMISSIONS.SCHEDULE.CREATE.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.SCHEDULE.UPDATE.action,
    name: PERMISSIONS.SCHEDULE.UPDATE.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.SCHEDULE.MANAGE_RECURRENCE.action,
    name: PERMISSIONS.SCHEDULE.MANAGE_RECURRENCE.name,
    isAdmin: false,
  },

  // Attendance Management
  {
    action: PERMISSIONS.ATTENDANCE.VIEW.action,
    name: PERMISSIONS.ATTENDANCE.VIEW.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.ATTENDANCE.MARK.action,
    name: PERMISSIONS.ATTENDANCE.MARK.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.ATTENDANCE.UPDATE.action,
    name: PERMISSIONS.ATTENDANCE.UPDATE.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.ATTENDANCE.REPORT.action,
    name: PERMISSIONS.ATTENDANCE.REPORT.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.ATTENDANCE.BULK_MARK.action,
    name: PERMISSIONS.ATTENDANCE.BULK_MARK.name,
    isAdmin: false,
  },

  // Group Management
  {
    action: PERMISSIONS.GROUP.VIEW.action,
    name: PERMISSIONS.GROUP.VIEW.name,
    isAdmin: false,
  },
  {
    action: PERMISSIONS.GROUP.MANAGE_STUDENTS.action,
    name: PERMISSIONS.GROUP.MANAGE_STUDENTS.name,
    isAdmin: false,
  },

  // Subject Management
  {
    action: PERMISSIONS.SUBJECT.VIEW.action,
    name: PERMISSIONS.SUBJECT.VIEW.name,
    isAdmin: false,
  },

  // Grade Level Management
  {
    action: PERMISSIONS.GRADE_LEVEL.VIEW.action,
    name: PERMISSIONS.GRADE_LEVEL.VIEW.name,
    isAdmin: false,
  },

  // Payment Management
  {
    action: PERMISSIONS.PAYMENT.VIEW.action,
    name: PERMISSIONS.PAYMENT.VIEW.name,
    isAdmin: false,
  },

  // Support Management
  {
    action: PERMISSIONS.SUPPORT.VIEW.action,
    name: PERMISSIONS.SUPPORT.VIEW.name,
    isAdmin: false,
  },
];

// Global admin permissions (isAdmin: true)
export const ALL_ADMIN_PERMISSIONS = [
  // User Management
  {
    action: PERMISSIONS.USER.CREATE.action,
    name: PERMISSIONS.USER.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.USER.UPDATE.action,
    name: PERMISSIONS.USER.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.USER.DELETE.action,
    name: PERMISSIONS.USER.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.USER.INVITE.action,
    name: PERMISSIONS.USER.INVITE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.USER.ASSIGN_ROLE.action,
    name: PERMISSIONS.USER.ASSIGN_ROLE.name,
    isAdmin: true,
  },

  // Center Management
  {
    action: PERMISSIONS.CENTER.CREATE.action,
    name: PERMISSIONS.CENTER.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.CENTER.UPDATE.action,
    name: PERMISSIONS.CENTER.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.CENTER.DELETE.action,
    name: PERMISSIONS.CENTER.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.CENTER.MANAGE.action,
    name: PERMISSIONS.CENTER.MANAGE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.CENTER.MANAGE_MEMBERS.action,
    name: PERMISSIONS.CENTER.MANAGE_MEMBERS.name,
    isAdmin: true,
  },

  // Student Management
  {
    action: PERMISSIONS.STUDENT.DELETE.action,
    name: PERMISSIONS.STUDENT.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.STUDENT.ASSIGN_GRADE_LEVEL.action,
    name: PERMISSIONS.STUDENT.ASSIGN_GRADE_LEVEL.name,
    isAdmin: true,
  },

  // Teacher Management
  {
    action: PERMISSIONS.TEACHER.CREATE.action,
    name: PERMISSIONS.TEACHER.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.TEACHER.DELETE.action,
    name: PERMISSIONS.TEACHER.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.TEACHER.ASSIGN_SUBJECT.action,
    name: PERMISSIONS.TEACHER.ASSIGN_SUBJECT.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.TEACHER.ASSIGN_GROUP.action,
    name: PERMISSIONS.TEACHER.ASSIGN_GROUP.name,
    isAdmin: true,
  },

  // Schedule Management
  {
    action: PERMISSIONS.SCHEDULE.DELETE.action,
    name: PERMISSIONS.SCHEDULE.DELETE.name,
    isAdmin: true,
  },

  // Attendance Management
  {
    action: PERMISSIONS.ATTENDANCE.DELETE.action,
    name: PERMISSIONS.ATTENDANCE.DELETE.name,
    isAdmin: true,
  },

  // Group Management
  {
    action: PERMISSIONS.GROUP.CREATE.action,
    name: PERMISSIONS.GROUP.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GROUP.UPDATE.action,
    name: PERMISSIONS.GROUP.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GROUP.DELETE.action,
    name: PERMISSIONS.GROUP.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GROUP.MANAGE_TEACHERS.action,
    name: PERMISSIONS.GROUP.MANAGE_TEACHERS.name,
    isAdmin: true,
  },

  // Subject Management
  {
    action: PERMISSIONS.SUBJECT.CREATE.action,
    name: PERMISSIONS.SUBJECT.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SUBJECT.UPDATE.action,
    name: PERMISSIONS.SUBJECT.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SUBJECT.DELETE.action,
    name: PERMISSIONS.SUBJECT.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SUBJECT.MANAGE_TEACHERS.action,
    name: PERMISSIONS.SUBJECT.MANAGE_TEACHERS.name,
    isAdmin: true,
  },

  // Grade Level Management
  {
    action: PERMISSIONS.GRADE_LEVEL.CREATE.action,
    name: PERMISSIONS.GRADE_LEVEL.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GRADE_LEVEL.UPDATE.action,
    name: PERMISSIONS.GRADE_LEVEL.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GRADE_LEVEL.DELETE.action,
    name: PERMISSIONS.GRADE_LEVEL.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GRADE_LEVEL.MANAGE_STUDENTS.action,
    name: PERMISSIONS.GRADE_LEVEL.MANAGE_STUDENTS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GRADE_LEVEL.MANAGE_GROUPS.action,
    name: PERMISSIONS.GRADE_LEVEL.MANAGE_GROUPS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.GRADE_LEVEL.MANAGE_SUBJECTS.action,
    name: PERMISSIONS.GRADE_LEVEL.MANAGE_SUBJECTS.name,
    isAdmin: true,
  },

  // Payment Management
  {
    action: PERMISSIONS.PAYMENT.CREATE.action,
    name: PERMISSIONS.PAYMENT.CREATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.PAYMENT.UPDATE.action,
    name: PERMISSIONS.PAYMENT.UPDATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.PAYMENT.DELETE.action,
    name: PERMISSIONS.PAYMENT.DELETE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.PAYMENT.PROCESS.action,
    name: PERMISSIONS.PAYMENT.PROCESS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.PAYMENT.REFUND.action,
    name: PERMISSIONS.PAYMENT.REFUND.name,
    isAdmin: true,
  },

  // Support Management
  {
    action: PERMISSIONS.SUPPORT.HANDLE.action,
    name: PERMISSIONS.SUPPORT.HANDLE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SUPPORT.ESCALATE.action,
    name: PERMISSIONS.SUPPORT.ESCALATE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SUPPORT.CLOSE.action,
    name: PERMISSIONS.SUPPORT.CLOSE.name,
    isAdmin: true,
  },

  // Access Control Management
  {
    action: PERMISSIONS.ACCESS_CONTROL.VIEW_ROLES.action,
    name: PERMISSIONS.ACCESS_CONTROL.VIEW_ROLES.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.CREATE_ROLE.action,
    name: PERMISSIONS.ACCESS_CONTROL.CREATE_ROLE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.UPDATE_ROLE.action,
    name: PERMISSIONS.ACCESS_CONTROL.UPDATE_ROLE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.DELETE_ROLE.action,
    name: PERMISSIONS.ACCESS_CONTROL.DELETE_ROLE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.ASSIGN_ROLE.action,
    name: PERMISSIONS.ACCESS_CONTROL.ASSIGN_ROLE.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.VIEW_PERMISSIONS.action,
    name: PERMISSIONS.ACCESS_CONTROL.VIEW_PERMISSIONS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.ACCESS_CONTROL.ASSIGN_PERMISSION.action,
    name: PERMISSIONS.ACCESS_CONTROL.ASSIGN_PERMISSION.name,
    isAdmin: true,
  },

  // System Management
  {
    action: PERMISSIONS.SYSTEM.VIEW_LOGS.action,
    name: PERMISSIONS.SYSTEM.VIEW_LOGS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SYSTEM.MANAGE_SETTINGS.action,
    name: PERMISSIONS.SYSTEM.MANAGE_SETTINGS.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SYSTEM.BACKUP.action,
    name: PERMISSIONS.SYSTEM.BACKUP.name,
    isAdmin: true,
  },
  {
    action: PERMISSIONS.SYSTEM.RESTORE.action,
    name: PERMISSIONS.SYSTEM.RESTORE.name,
    isAdmin: true,
  },
];

// All permissions combined
export const ALL_PERMISSIONS = [
  ...ALL_USER_PERMISSIONS,
  ...ALL_ADMIN_PERMISSIONS,
];

// Center role-specific permission arrays
export const OWNER_PERMISSIONS = [
  // User Management
  PERMISSIONS.USER.VIEW.action,
  PERMISSIONS.USER.CREATE.action,
  PERMISSIONS.USER.UPDATE.action,
  PERMISSIONS.USER.DELETE.action,
  PERMISSIONS.USER.INVITE.action,
  PERMISSIONS.USER.ASSIGN_ROLE.action,
  // Center Management
  PERMISSIONS.CENTER.VIEW.action,
  PERMISSIONS.CENTER.CREATE.action,
  PERMISSIONS.CENTER.UPDATE.action,
  PERMISSIONS.CENTER.DELETE.action,
  PERMISSIONS.CENTER.MANAGE.action,
  PERMISSIONS.CENTER.MANAGE_MEMBERS.action,
  // Student Management
  PERMISSIONS.STUDENT.VIEW.action,
  PERMISSIONS.STUDENT.CREATE.action,
  PERMISSIONS.STUDENT.UPDATE.action,
  PERMISSIONS.STUDENT.DELETE.action,
  PERMISSIONS.STUDENT.ASSIGN_GROUP.action,
  PERMISSIONS.STUDENT.ASSIGN_GRADE_LEVEL.action,
  // Teacher Management
  PERMISSIONS.TEACHER.VIEW.action,
  PERMISSIONS.TEACHER.CREATE.action,
  PERMISSIONS.TEACHER.UPDATE.action,
  PERMISSIONS.TEACHER.DELETE.action,
  PERMISSIONS.TEACHER.ASSIGN_SUBJECT.action,
  PERMISSIONS.TEACHER.ASSIGN_GROUP.action,
  // Schedule Management
  PERMISSIONS.SCHEDULE.VIEW.action,
  PERMISSIONS.SCHEDULE.CREATE.action,
  PERMISSIONS.SCHEDULE.UPDATE.action,
  PERMISSIONS.SCHEDULE.DELETE.action,
  PERMISSIONS.SCHEDULE.MANAGE_RECURRENCE.action,
  // Attendance Management
  PERMISSIONS.ATTENDANCE.VIEW.action,
  PERMISSIONS.ATTENDANCE.MARK.action,
  PERMISSIONS.ATTENDANCE.UPDATE.action,
  PERMISSIONS.ATTENDANCE.DELETE.action,
  PERMISSIONS.ATTENDANCE.REPORT.action,
  PERMISSIONS.ATTENDANCE.BULK_MARK.action,
  // Group Management
  PERMISSIONS.GROUP.VIEW.action,
  PERMISSIONS.GROUP.CREATE.action,
  PERMISSIONS.GROUP.UPDATE.action,
  PERMISSIONS.GROUP.DELETE.action,
  PERMISSIONS.GROUP.MANAGE_STUDENTS.action,
  PERMISSIONS.GROUP.MANAGE_TEACHERS.action,
  // Subject Management
  PERMISSIONS.SUBJECT.VIEW.action,
  PERMISSIONS.SUBJECT.CREATE.action,
  PERMISSIONS.SUBJECT.UPDATE.action,
  PERMISSIONS.SUBJECT.DELETE.action,
  PERMISSIONS.SUBJECT.MANAGE_TEACHERS.action,
  // Grade Level Management
  PERMISSIONS.GRADE_LEVEL.VIEW.action,
  PERMISSIONS.GRADE_LEVEL.CREATE.action,
  PERMISSIONS.GRADE_LEVEL.UPDATE.action,
  PERMISSIONS.GRADE_LEVEL.DELETE.action,
  PERMISSIONS.GRADE_LEVEL.MANAGE_STUDENTS.action,
  PERMISSIONS.GRADE_LEVEL.MANAGE_GROUPS.action,
  PERMISSIONS.GRADE_LEVEL.MANAGE_SUBJECTS.action,
  // Payment Management
  PERMISSIONS.PAYMENT.VIEW.action,
  PERMISSIONS.PAYMENT.CREATE.action,
  PERMISSIONS.PAYMENT.UPDATE.action,
  PERMISSIONS.PAYMENT.DELETE.action,
  PERMISSIONS.PAYMENT.PROCESS.action,
  PERMISSIONS.PAYMENT.REFUND.action,
  // Support Management
  PERMISSIONS.SUPPORT.VIEW.action,
  PERMISSIONS.SUPPORT.HANDLE.action,
  PERMISSIONS.SUPPORT.ESCALATE.action,
  PERMISSIONS.SUPPORT.CLOSE.action,
  // Access Control Management
  PERMISSIONS.ACCESS_CONTROL.VIEW_ROLES.action,
  PERMISSIONS.ACCESS_CONTROL.CREATE_ROLE.action,
  PERMISSIONS.ACCESS_CONTROL.UPDATE_ROLE.action,
  PERMISSIONS.ACCESS_CONTROL.DELETE_ROLE.action,
  PERMISSIONS.ACCESS_CONTROL.ASSIGN_ROLE.action,
  PERMISSIONS.ACCESS_CONTROL.VIEW_PERMISSIONS.action,
  PERMISSIONS.ACCESS_CONTROL.ASSIGN_PERMISSION.action,
  // System Management
  PERMISSIONS.SYSTEM.VIEW_LOGS.action,
  PERMISSIONS.SYSTEM.MANAGE_SETTINGS.action,
  PERMISSIONS.SYSTEM.BACKUP.action,
  PERMISSIONS.SYSTEM.RESTORE.action,
];

export const TEACHER_PERMISSIONS = [
  // User Management
  PERMISSIONS.USER.VIEW.action,
  // Center Management
  PERMISSIONS.CENTER.VIEW.action,
  // Student Management
  PERMISSIONS.STUDENT.VIEW.action,
  PERMISSIONS.STUDENT.CREATE.action,
  PERMISSIONS.STUDENT.UPDATE.action,
  PERMISSIONS.STUDENT.ASSIGN_GROUP.action,
  // Teacher Management
  PERMISSIONS.TEACHER.VIEW.action,
  PERMISSIONS.TEACHER.UPDATE.action,
  // Schedule Management
  PERMISSIONS.SCHEDULE.VIEW.action,
  PERMISSIONS.SCHEDULE.CREATE.action,
  PERMISSIONS.SCHEDULE.UPDATE.action,
  PERMISSIONS.SCHEDULE.MANAGE_RECURRENCE.action,
  // Attendance Management
  PERMISSIONS.ATTENDANCE.VIEW.action,
  PERMISSIONS.ATTENDANCE.MARK.action,
  PERMISSIONS.ATTENDANCE.UPDATE.action,
  PERMISSIONS.ATTENDANCE.REPORT.action,
  PERMISSIONS.ATTENDANCE.BULK_MARK.action,
  // Group Management
  PERMISSIONS.GROUP.VIEW.action,
  PERMISSIONS.GROUP.MANAGE_STUDENTS.action,
  // Subject Management
  PERMISSIONS.SUBJECT.VIEW.action,
  // Grade Level Management
  PERMISSIONS.GRADE_LEVEL.VIEW.action,
  // Payment Management
  PERMISSIONS.PAYMENT.VIEW.action,
  // Support Management
  PERMISSIONS.SUPPORT.VIEW.action,
];

export const STUDENT_PERMISSIONS = [
  // User Management
  PERMISSIONS.USER.VIEW.action,
  // Center Management
  PERMISSIONS.CENTER.VIEW.action,
  // Schedule Management
  PERMISSIONS.SCHEDULE.VIEW.action,
  // Attendance Management
  PERMISSIONS.ATTENDANCE.VIEW.action,
  // Group Management
  PERMISSIONS.GROUP.VIEW.action,
  // Subject Management
  PERMISSIONS.SUBJECT.VIEW.action,
  // Grade Level Management
  PERMISSIONS.GRADE_LEVEL.VIEW.action,
  // Payment Management
  PERMISSIONS.PAYMENT.VIEW.action,
  // Support Management
  PERMISSIONS.SUPPORT.VIEW.action,
];
