/**
 * Types of student charges in the billing system
 * Consolidated from scattered entity definitions
 */
export enum StudentChargeType {
  SUBSCRIPTION = 'SUBSCRIPTION',  // Monthly/annual subscriptions
  SESSION = 'SESSION',            // Individual session charges
  MONTHLY = 'MONTHLY',            // Monthly billing
  CLASS = 'CLASS',                // Class-based charges
}