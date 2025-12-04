import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';
import { StudentPaymentUnit } from '../enums/student-payment-unit.enum';

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
 * Student payment strategy
 * - SESSION: amount for a specific number of sessions (requires count)
 * - HOUR: amount for a specific number of hours (requires count)
 * - MONTH: amount for a specific number of months (requires count)
 * - CLASS: total amount for the full class period (1 payment, count not used)
 */
export interface StudentPaymentStrategy {
  per: StudentPaymentUnit;
  count?: number; // Required when per is SESSION, HOUR, or MONTH, ignored when per is CLASS
  amount: number;
}
