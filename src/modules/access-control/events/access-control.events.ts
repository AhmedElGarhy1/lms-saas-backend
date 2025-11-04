import { ActorUser } from '@/shared/common/types/actor-user.type';

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
    public readonly actor: ActorUser,
    public readonly centerId?: string,
  ) {}
}

export class RevokeUserAccessEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
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
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class AssignRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
  ) {}
}

export class RevokeRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
  ) {}
}
