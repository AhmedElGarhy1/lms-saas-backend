/**
 * Interface for payment strategy operations
 * Provides abstraction layer for payment strategy service
 */
export interface IPaymentStrategyService {
  /**
   * Get student payment strategy for a class
   * @param classId - The class ID
   * @returns Payment strategy or null if not found
   */
  getStudentPaymentStrategyForClass(
    classId: string,
  ): Promise<any | null>; // Using any to avoid circular dependency with PaymentStrategy type
}
