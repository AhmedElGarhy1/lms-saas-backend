/**
 * Date utility functions for student billing module
 * Provides consistent date calculations for monthly subscriptions
 */
export class DateHelpers {
  /**
   * Get current month (1-12)
   * JavaScript months are 0-indexed, so we add 1
   */
  static getCurrentMonth(): number {
    return new Date().getMonth() + 1;
  }

  /**
   * Get current year
   */
  static getCurrentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Get current month and year as an object
   */
  static getCurrentMonthYear(): { month: number; year: number } {
    return {
      month: this.getCurrentMonth(),
      year: this.getCurrentYear(),
    };
  }
}
