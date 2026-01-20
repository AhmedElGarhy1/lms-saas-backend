import { ActorUser } from '@/shared/common/types/actor-user.type';

// Command event classes (for listeners to handle)
export class GrantCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
    public readonly targetUserId?: string, // Who was affected (the user getting access)
    public readonly isCenterAccessActive?: boolean,
  ) {}
}

export class RevokeCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
    public readonly targetUserId?: string, // Who was affected (the user losing access)
  ) {}
}

export class ActivateCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly isActive: boolean,
    public readonly actor: ActorUser,
    public readonly targetUserId?: string, // Who was affected
  ) {}
}

export class DeactivateCenterAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly centerId: string,
    public readonly isActive: boolean,
    public readonly actor: ActorUser,
    public readonly targetUserId?: string, // Who was affected
  ) {}
}

export class GrantUserAccessEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
    public readonly targetUserId?: string,
  ) {}
}

export class RevokeUserAccessEvent {
  constructor(
    public readonly granterUserProfileId: string,
    public readonly targetUserProfileId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
    public readonly targetUserId?: string,
  ) {}
}

export class GrantBranchAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly centerId: string,
    public readonly actor: ActorUser,
    public readonly targetUserId?: string, // Who was affected (the user getting access)
  ) {}
}

export class RevokeBranchAccessEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly branchId: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
    public readonly targetUserId?: string, // Who was affected (the user losing access)
  ) {}
}

export class AssignRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
    public readonly targetUserId?: string, // Who was affected (the user getting the role)
  ) {}
}

export class RevokeRoleEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly roleId: string,
    public readonly actor: ActorUser,
    public readonly centerId?: string,
    public readonly targetUserId?: string, // Who was affected (the user losing the role)
  ) {}
}
