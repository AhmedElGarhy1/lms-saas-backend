import { ActorUser } from '@/shared/common/types/actor-user.type';

export enum AccessControlEvents {
  CENTER_ACCESS_GRANTED = 'center.access.granted',
  CENTER_ACCESS_REVOKED = 'center.access.revoked',
  USER_ACCESS_GRANTED = 'user.access.granted',
  USER_ACCESS_REVOKED = 'user.access.revoked',
  BRANCH_ACCESS_GRANTED = 'branch.access.granted',
  BRANCH_ACCESS_REVOKED = 'branch.access.revoked',
}

export class RoleAssignedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly centerId: string,
    public readonly actor?: ActorUser,
  ) {}
}

export class RoleRevokedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor?: ActorUser,
  ) {}
}

export class CenterAccessGrantedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class CenterAccessRevokedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class UserAccessGrantedEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class UserAccessRevokedEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class BranchAccessGrantedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class BranchAccessRevokedEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}
