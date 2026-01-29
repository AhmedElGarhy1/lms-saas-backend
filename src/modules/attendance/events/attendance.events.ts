import { ActorUser } from '@/shared/common/types/actor-user.type';

/**
 * Emitted when one or more students are marked absent (e.g. via mark-all-absent).
 * Used to notify parents (and optionally students).
 */
export class StudentsMarkedAbsentEvent {
  constructor(
    public readonly sessionId: string,
    public readonly groupId: string,
    public readonly centerId: string,
    public readonly studentUserProfileIds: string[],
    public readonly actor: ActorUser,
  ) {}
}
