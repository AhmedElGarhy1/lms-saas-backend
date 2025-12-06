/**
 * Utility class for building SQL queries to check schedule conflicts.
 * Consolidates the common logic used in both student and teacher conflict detection.
 */
export class ScheduleConflictQueryBuilder {
  /**
   * SQL parameter indices constants
   */
  private static readonly SQL_PARAMS = {
    USER_ID: 1, // $1 is always the user ID (student or teacher)
    SCHEDULE_ITEM_BASE: 2, // $2 is the start of schedule items
    SCHEDULE_ITEM_SIZE: 3, // Each schedule item takes 3 parameters (day, startTime, duration)
  } as const;

  /**
   * Builds SQL parameters array for schedule conflict queries.
   *
   * @param userId - The user ID (student or teacher)
   * @param scheduleItems - Array of schedule items to check (with duration instead of endTime)
   * @returns Array of parameters for SQL query
   */
  static buildParameters(
    userId: string,
    scheduleItems: Array<{ day: string; startTime: string; duration: number }>,
  ): (string | number)[] {
    const params: (string | number)[] = [userId];
    scheduleItems.forEach((item) => {
      params.push(item.day, item.startTime, item.duration);
    });
    return params;
  }

  /**
   * Builds conflict conditions SQL for schedule items.
   * Two time slots overlap if: start1 < end2 AND start2 < end1
   * End time is calculated from startTime + duration in SQL.
   *
   * @param scheduleItems - Array of schedule items to check (with duration instead of endTime)
   * @returns SQL condition string for conflict detection
   */
  static buildConflictConditions(
    scheduleItems: Array<{ day: string; startTime: string; duration: number }>,
  ): string {
    return scheduleItems
      .map((_, index) => {
        const baseIndex =
          this.SQL_PARAMS.SCHEDULE_ITEM_BASE +
          index * this.SQL_PARAMS.SCHEDULE_ITEM_SIZE;
        // Calculate endTime in SQL: startTime + duration minutes
        // For existing items, we calculate endTime from existing.startTime + class.duration
        // For new items, we calculate endTime from $startTime + $duration
        // Use COALESCE to handle null duration (default to 60 minutes if null)
        return `(
          existing.day = $${baseIndex}
          AND (
            TO_TIMESTAMP(existing."startTime", 'HH24:MI') < 
            (TO_TIMESTAMP($${baseIndex + 1}, 'HH24:MI') + ($${baseIndex + 2} || ' minutes')::INTERVAL)
            AND TO_TIMESTAMP($${baseIndex + 1}, 'HH24:MI') < 
            (TO_TIMESTAMP(existing."startTime", 'HH24:MI') + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)
          )
        )`;
      })
      .join(' OR ');
  }

  /**
   * Builds exclude condition for group ID(s) if provided.
   * Supports both single group ID and multiple group IDs for backward compatibility.
   *
   * @param excludeGroupIds - Optional group ID(s) to exclude from conflict check (single ID or array)
   * @param currentParamIndex - Current parameter index (after schedule items)
   * @returns SQL condition string and updated parameter index
   */
  static buildExcludeCondition(
    excludeGroupIds: string | string[] | undefined,
    currentParamIndex: number,
  ): { condition: string; nextParamIndex: number } {
    if (!excludeGroupIds) {
      return { condition: '', nextParamIndex: currentParamIndex };
    }

    // Normalize to array
    const groupIds = Array.isArray(excludeGroupIds)
      ? excludeGroupIds
      : [excludeGroupIds];

    if (groupIds.length === 0) {
      return { condition: '', nextParamIndex: currentParamIndex };
    }

    // Single ID: use != for backward compatibility
    if (groupIds.length === 1) {
      const excludeParamIndex = currentParamIndex + 1;
      return {
        condition: `AND g.id != $${excludeParamIndex}`,
        nextParamIndex: excludeParamIndex,
      };
    }

    // Multiple IDs: use NOT IN
    const paramIndices = groupIds
      .map((_, index) => `$${currentParamIndex + 1 + index}`)
      .join(', ');
    return {
      condition: `AND g.id NOT IN (${paramIndices})`,
      nextParamIndex: currentParamIndex + groupIds.length,
    };
  }

  /**
   * Adds exclude group ID(s) to parameters array if provided.
   * Supports both single group ID and multiple group IDs for backward compatibility.
   *
   * @param params - Current parameters array
   * @param excludeGroupIds - Optional group ID(s) to exclude (single ID or array)
   * @returns Updated parameters array
   */
  static addExcludeParameter(
    params: (string | number)[],
    excludeGroupIds: string | string[] | undefined,
  ): (string | number)[] {
    if (!excludeGroupIds) {
      return params;
    }

    // Normalize to array and add all IDs
    const groupIds = Array.isArray(excludeGroupIds)
      ? excludeGroupIds
      : [excludeGroupIds];

    params.push(...groupIds);
    return params;
  }
}
