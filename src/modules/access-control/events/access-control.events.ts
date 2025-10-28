import { ActorUser } from '@/shared/common/types/actor-user.type';

export enum AccessControlEvents {
  // Command events (for listeners to handle)
  GRANT_CENTER_ACCESS = 'access.control.grant.center.access',
  REVOKE_CENTER_ACCESS = 'access.control.revoke.center.access',
  GRANT_USER_ACCESS = 'access.control.grant.user.access',
  REVOKE_USER_ACCESS = 'access.control.revoke.user.access',
  GRANT_BRANCH_ACCESS = 'access.control.grant.branch.access',
  REVOKE_BRANCH_ACCESS = 'access.control.revoke.branch.access',
  ASSIGN_ROLE = 'access.control.assign.role',
  REVOKE_ROLE = 'access.control.revoke.role',
}

// Command event classes (for listeners to handle)
export class GrantCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RevokeCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class GrantUserAccessEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RevokeUserAccessEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class GrantBranchAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RevokeBranchAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class AssignRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RevokeRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}
