/**
 * Virtual Session ID Utility
 *
 * Handles generation and parsing of virtual session IDs.
 * Virtual IDs are used for sessions that don't exist in the database yet
 * but are calculated from schedule items.
 *
 * Format: virtual|{groupId}|{startTimeISO}|{scheduleItemId?}
 * Example: virtual|550e8400-e29b-41d4-a716-446655440000|2025-01-15T09:00:00.000Z|schedule-item-uuid
 */

/**
 * Generate virtual session ID from session information
 *
 * @param groupId - Group ID (UUID)
 * @param startTime - Session start time (UTC Date)
 * @param scheduleItemId - Optional schedule item ID (UUID)
 * @returns Virtual session ID string
 */
export function generateVirtualSessionId(
  groupId: string,
  startTime: Date,
  scheduleItemId?: string,
): string {
  return `virtual|${groupId}|${startTime.toISOString()}|${scheduleItemId || ''}`;
}

/**
 * Check if an ID is a virtual session ID
 *
 * @param id - Session ID to check
 * @returns True if virtual ID, false otherwise
 */
export function isVirtualSessionId(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  return id.startsWith('virtual|');
}

/**
 * Parse virtual session ID and extract information
 * Returns null if not a virtual ID (i.e., it's a real UUID)
 *
 * @param id - Session ID to parse
 * @returns Parsed information or null if not a virtual ID
 */
export function parseVirtualSessionId(id: string): {
  groupId: string;
  startTime: Date;
  scheduleItemId?: string;
} | null {
  if (!isVirtualSessionId(id)) {
    return null;
  }

  const parts = id.split('|');

  // Validate format: should have 4 parts (virtual, groupId, startTime, scheduleItemId)
  // scheduleItemId may be empty string
  if (parts.length !== 4 || parts[0] !== 'virtual') {
    return null;
  }

  const [, groupId, startTimeISO, scheduleItemId] = parts;

  // Validate groupId is not empty
  if (!groupId) {
    return null;
  }

  // Parse startTime
  const startTime = new Date(startTimeISO);
  if (isNaN(startTime.getTime())) {
    return null; // Invalid date
  }

  return {
    groupId,
    startTime,
    scheduleItemId: scheduleItemId || undefined, // Convert empty string to undefined
  };
}
