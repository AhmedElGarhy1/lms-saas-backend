import { AuthEvents } from './auth.events.enum';
import { UserEvents } from './user.events.enum';
import { RoleEvents } from './role.events.enum';
import { CenterEvents } from './center.events.enum';
import { BranchEvents } from './branch.events.enum';
import { StaffEvents } from './staff.events.enum';
import { StudentEvents } from './student.events.enum';
import { TeacherEvents } from './teacher.events.enum';
import { AdminEvents } from './admin.events.enum';
import { AccessControlEvents } from './access-control.events.enum';
import { NotificationEvents } from './notification.events.enum';
import { ClassEvents } from './classes.events.enum';
import { GroupEvents } from './groups.events.enum';
import { StudentBillingEvents } from './student-billing.events.enum';
import { ExpenseEvents } from './expenses.events.enum';
import { TeacherPayoutEvents } from './teacher-payouts.events.enum';

export type EventType =
  | AuthEvents
  | UserEvents
  | RoleEvents
  | CenterEvents
  | BranchEvents
  | StaffEvents
  | StudentEvents
  | TeacherEvents
  | AdminEvents
  | AccessControlEvents
  | NotificationEvents
  | ClassEvents
  | GroupEvents
  | StudentBillingEvents
  | ExpenseEvents
  | TeacherPayoutEvents;
