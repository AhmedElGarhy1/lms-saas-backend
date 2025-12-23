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
 * - SESSION: amount per session
 * - HOUR: amount per hour
 * - MONTH: amount per month
 * - CLASS: total amount for the full class period (1 payment)
 */
export interface StudentPaymentStrategy {
  per: StudentPaymentUnit;
  amount: number;
}
