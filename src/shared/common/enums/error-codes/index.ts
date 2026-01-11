// Common error codes
export { CommonErrorCode } from './common.codes';

// Module-specific error codes
export { AuthErrorCode } from '@/modules/auth/enums/auth.codes';
export { UserErrorCode } from '@/modules/user/enums/user.codes';
export { FinanceErrorCode } from '@/modules/finance/enums/finance.codes';
export { AccessControlErrorCode } from '@/modules/access-control/enums/access-control.codes';
export { ClassErrorCode } from '@/modules/classes/enums/classes.codes';
export { CentersErrorCode } from '@/modules/centers/enums/centers.codes';
export { SessionErrorCode } from '@/modules/sessions/enums/sessions.codes';
export { AttendanceErrorCode } from '@/modules/attendance/enums/attendance.codes';
export { LevelErrorCode } from '@/modules/levels/enums/levels.codes';
export { SubjectErrorCode } from '@/modules/subjects/enums/subjects.codes';
export { StaffErrorCode } from '@/modules/staff/enums/staff.codes';
export { StudentErrorCode } from '@/modules/students/enums/students.codes';
export { TeacherErrorCode } from '@/modules/teachers/enums/teachers.codes';
export { AdminErrorCode } from '@/modules/admin/enums/admin.codes';
export { UserProfileErrorCode } from '@/modules/user-profile/enums/user-profile.codes';
export { StudentBillingErrorCode } from '@/modules/student-billing/enums/student-billing.codes';
export { TeacherPayoutErrorCode } from '@/modules/teacher-payouts/enums/teacher-payouts.codes';
export { NotificationErrorCode } from '@/modules/notifications/enums/notification.codes';
export { R2ErrorCode } from '@/modules/r2/enums/r2.codes';
export { FileErrorCode } from '@/modules/file/enums/file.codes';

// Import types for union
import { CommonErrorCode as CommonCode } from './common.codes';
import { AuthErrorCode as AuthCode } from '@/modules/auth/enums/auth.codes';
import { UserErrorCode as UserCode } from '@/modules/user/enums/user.codes';
import { FinanceErrorCode as FinanceCode } from '@/modules/finance/enums/finance.codes';
import { AccessControlErrorCode as AccessControlCode } from '@/modules/access-control/enums/access-control.codes';
import { ClassErrorCode as ClassCode } from '@/modules/classes/enums/classes.codes';
import { CentersErrorCode as CentersCode } from '@/modules/centers/enums/centers.codes';
import { SessionErrorCode as SessionCode } from '@/modules/sessions/enums/sessions.codes';
import { AttendanceErrorCode as AttendanceCode } from '@/modules/attendance/enums/attendance.codes';
import { LevelErrorCode as LevelCode } from '@/modules/levels/enums/levels.codes';
import { SubjectErrorCode as SubjectCode } from '@/modules/subjects/enums/subjects.codes';
import { StaffErrorCode as StaffCode } from '@/modules/staff/enums/staff.codes';
import { StudentErrorCode as StudentCode } from '@/modules/students/enums/students.codes';
import { TeacherErrorCode as TeacherCode } from '@/modules/teachers/enums/teachers.codes';
import { AdminErrorCode as AdminCode } from '@/modules/admin/enums/admin.codes';
import { UserProfileErrorCode as UserProfileCode } from '@/modules/user-profile/enums/user-profile.codes';
import { StudentBillingErrorCode as StudentBillingCode } from '@/modules/student-billing/enums/student-billing.codes';
import { TeacherPayoutErrorCode as TeacherPayoutCode } from '@/modules/teacher-payouts/enums/teacher-payouts.codes';
import { NotificationErrorCode as NotificationCode } from '@/modules/notifications/enums/notification.codes';
import { R2ErrorCode as R2Code } from '@/modules/r2/enums/r2.codes';
import { FileErrorCode as FileCode } from '@/modules/file/enums/file.codes';

// Create the union type for type safety
export type AllErrorCodes =
  | CommonCode
  | AuthCode
  | UserCode
  | FinanceCode
  | AccessControlCode
  | ClassCode
  | CentersCode
  | SessionCode
  | AttendanceCode
  | LevelCode
  | SubjectCode
  | StaffCode
  | StudentCode
  | TeacherCode
  | AdminCode
  | UserProfileCode
  | StudentBillingCode
  | TeacherPayoutCode
  | NotificationCode
  | R2Code
  | FileCode;
