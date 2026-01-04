import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';

/**
 * Teacher payment strategy
 * - STUDENT: amount per student
 * - HOUR: amount per hour
 * - SESSION: amount per session
 * - MONTH: amount per month
 * - CLASS: total amount for the full class period (1 payment)
 */
export interface TeacherPaymentStrategy {
  per: TeacherPaymentUnit;
  amount: number;
}

/**
 * Student payment strategy - granular payment options
 * - includeSession: allow per-session payments (with sessionPrice)
 * - includeMonth: allow monthly subscriptions (with monthPrice)
 */
export interface StudentPaymentStrategy {
  includeSession: boolean;
  sessionPrice?: number;
  includeMonth: boolean;
  monthPrice?: number;
}
