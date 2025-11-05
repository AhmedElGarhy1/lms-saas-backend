export enum AccessControlEvents {
  GRANT_CENTER_ACCESS = 'access.control.granted.center.access',
  REVOKE_CENTER_ACCESS = 'access.control.revoked.center.access',
  ACTIVATE_CENTER_ACCESS = 'access.control.activated.center.access',
  DEACTIVATE_CENTER_ACCESS = 'access.control.deactivated.center.access',
  GRANT_USER_ACCESS = 'access.control.granted.user.access',
  REVOKE_USER_ACCESS = 'access.control.revoked.user.access',
  GRANT_BRANCH_ACCESS = 'access.control.granted.branch.access',
  REVOKE_BRANCH_ACCESS = 'access.control.revoked.branch.access',
  ASSIGN_ROLE = 'access.control.assigned.role',
  REVOKE_ROLE = 'access.control.revoked.role',
}
