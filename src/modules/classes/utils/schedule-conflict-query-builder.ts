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
    SCHEDULE_ITEM_SIZE: 3, // Each schedule item takes 3 parameters (day, startTime, endTime)
  } as const;

  /**
   * Builds SQL parameters array for schedule conflict queries.
   *
   * @param userId - The user ID (student or teacher)
   * @param scheduleItems - Array of schedule items to check
   * @returns Array of parameters for SQL query
   */
  static buildParameters(
    userId: string,
    scheduleItems: Array<{ day: string; startTime: string; endTime: string }>,
  ): (string | number)[] {
    const params: (string | number)[] = [userId];
    scheduleItems.forEach((item) => {
      params.push(item.day, item.startTime, item.endTime);
    });
    return params;
  }

  /**
   * Builds conflict conditions SQL for schedule items.
   * Two time slots overlap if: start1 < end2 AND start2 < end1
   *
   * @param scheduleItems - Array of schedule items to check
   * @returns SQL condition string for conflict detection
   */
  static buildConflictConditions(
    scheduleItems: Array<{ day: string; startTime: string; endTime: string }>,
  ): string {
    return scheduleItems
      .map((_, index) => {
        const baseIndex =
          this.SQL_PARAMS.SCHEDULE_ITEM_BASE + index * this.SQL_PARAMS.SCHEDULE_ITEM_SIZE;
        return `(
          existing.day = $${baseIndex}
          AND (
            TO_TIMESTAMP(existing."startTime", 'HH24:MI') < TO_TIMESTAMP($${baseIndex + 2}, 'HH24:MI')
            AND TO_TIMESTAMP($${baseIndex + 1}, 'HH24:MI') < TO_TIMESTAMP(existing."endTime", 'HH24:MI')
          )
        )`;
      })
      .join(' OR ');
  }

  /**
   * Builds exclude condition for group ID if provided.
   *
   * @param excludeGroupId - Optional group ID to exclude from conflict check
   * @param currentParamIndex - Current parameter index (after schedule items)
   * @returns SQL condition string and updated parameter index
   */
  static buildExcludeCondition(
    excludeGroupId: string | undefined,
    currentParamIndex: number,
  ): { condition: string; nextParamIndex: number } {
    if (!excludeGroupId) {
      return { condition: '', nextParamIndex: currentParamIndex };
    }

    const excludeParamIndex = currentParamIndex + 1;
    return {
      condition: `AND g.id != $${excludeParamIndex}`,
      nextParamIndex: excludeParamIndex,
    };
  }

  /**
   * Adds exclude group ID to parameters array if provided.
   *
   * @param params - Current parameters array
   * @param excludeGroupId - Optional group ID to exclude
   * @returns Updated parameters array
   */
  static addExcludeParameter(
    params: (string | number)[],
    excludeGroupId: string | undefined,
  ): (string | number)[] {
    if (excludeGroupId) {
      params.push(excludeGroupId);
    }
    return params;
  }
}

