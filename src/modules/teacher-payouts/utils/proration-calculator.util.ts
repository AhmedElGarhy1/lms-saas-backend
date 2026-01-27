import { differenceInDays, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';

/**
 * Utility functions for calculating prorated teacher payouts based on class dates
 */

export interface ProrationResult {
  daysActive: number;
  daysInMonth: number;
  proratedAmount: number;
  isFullMonth: boolean;
}

/**
 * Calculate prorated amount for a monthly teacher payout based on class active days
 *
 * @param monthlyAmount - Full monthly amount
 * @param classStartDate - Class start date
 * @param classEndDate - Class end date (optional, null if class hasn't ended)
 * @param month - Target month (1-12)
 * @param year - Target year
 * @returns ProrationResult with days active, prorated amount, and metadata
 */
export function calculateProratedMonthlyPayout(
  monthlyAmount: number,
  classStartDate: Date,
  classEndDate: Date | null | undefined,
  month: number,
  year: number,
): ProrationResult {
  // Get month boundaries (start and end of the target month)
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  // Calculate the actual period the class was active in this month
  const periodStart = isBefore(classStartDate, monthStart) ? monthStart : classStartDate;
  const periodEnd = classEndDate
    ? isAfter(classEndDate, monthEnd)
      ? monthEnd
      : classEndDate
    : monthEnd;

  // Calculate days active (inclusive of both start and end dates)
  const daysActive = differenceInDays(periodEnd, periodStart) + 1;
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

  // Calculate prorated amount
  const proratedAmount = (monthlyAmount / daysInMonth) * daysActive;

  // Check if it's a full month
  const isFullMonth = daysActive === daysInMonth;

  return {
    daysActive,
    daysInMonth,
    proratedAmount: Math.round(proratedAmount * 100) / 100, // Round to 2 decimal places
    isFullMonth,
  };
}

/**
 * Check if a class was active during a specific month
 *
 * @param classStartDate - Class start date
 * @param classEndDate - Class end date (optional)
 * @param month - Target month (1-12)
 * @param year - Target year
 * @returns true if class was active during any part of the month
 */
export function wasClassActiveInMonth(
  classStartDate: Date,
  classEndDate: Date | null | undefined,
  month: number,
  year: number,
): boolean {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  // Class must have started before or during the month
  if (isAfter(classStartDate, monthEnd)) {
    return false;
  }

  // If class has ended, it must have ended after or during the month
  if (classEndDate && isBefore(classEndDate, monthStart)) {
    return false;
  }

  return true;
}
