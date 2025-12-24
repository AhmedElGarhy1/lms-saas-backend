import { ClassStatus } from '../enums/class-status.enum';

/**
 * Map of allowed status transitions
 * Key: current status, Value: array of allowed next statuses
 */
const ALLOWED_TRANSITIONS: Record<ClassStatus, ClassStatus[]> = {
  [ClassStatus.PENDING_TEACHER_APPROVAL]: [
    ClassStatus.NOT_STARTED, // Teacher approves
    ClassStatus.CANCELED, // Teacher rejects / manual
  ],
  [ClassStatus.NOT_STARTED]: [
    ClassStatus.ACTIVE, // startDate reached / manual
    ClassStatus.CANCELED, // manual
  ],
  [ClassStatus.ACTIVE]: [
    ClassStatus.PAUSED, // manual (holidays/issues)
    ClassStatus.FINISHED, // endDate reached / manual
    ClassStatus.CANCELED, // manual
  ],
  [ClassStatus.PAUSED]: [
    ClassStatus.ACTIVE, // manual (resume)
    ClassStatus.CANCELED, // manual
  ],
  [ClassStatus.FINISHED]: [
    ClassStatus.ACTIVE, // Revert within 24-hour grace period
  ],
  [ClassStatus.CANCELED]: [
    ClassStatus.ACTIVE, // Revert within 24-hour grace period
  ],
};

/**
 * Get available status transitions from a current status
 * @param currentStatus - The current status of the class
 * @returns Array of statuses that can be transitioned to from the current status
 */
export function getAvailableStatuses(
  currentStatus: ClassStatus,
): ClassStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status transition is valid
 * @param from - The current status
 * @param to - The target status
 * @returns true if the transition is allowed, false otherwise
 */
export function isValidTransition(from: ClassStatus, to: ClassStatus): boolean {
  // Same status is always valid (no-op)
  if (from === to) {
    return true;
  }

  const allowedStatuses = ALLOWED_TRANSITIONS[from];
  return allowedStatuses?.includes(to) ?? false;
}
