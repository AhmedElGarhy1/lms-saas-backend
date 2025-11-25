import { AuthEvents } from './auth.events.enum';
import { UserEvents } from './user.events.enum';
import { RoleEvents } from './role.events.enum';
import { CenterEvents } from './center.events.enum';
import { BranchEvents } from './branch.events.enum';
import { StaffEvents } from './staff.events.enum';
import { AdminEvents } from './admin.events.enum';
import { AccessControlEvents } from './access-control.events.enum';
import { NotificationEvents } from './notification.events.enum';

export type EventType =
  | AuthEvents
  | UserEvents
  | RoleEvents
  | CenterEvents
  | BranchEvents
  | StaffEvents
  | AdminEvents
  | AccessControlEvents
  | NotificationEvents;
