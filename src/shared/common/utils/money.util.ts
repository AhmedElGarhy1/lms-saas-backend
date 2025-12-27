import Decimal from 'decimal.js';

/**
 * Money utility class for safe monetary operations.
 * Uses decimal.js to prevent floating-point precision errors.
 * All monetary calculations MUST use this class instead of native JavaScript numbers.
 */
export class Money {
  private readonly value: Decimal;

  constructor(value: number | string | Decimal) {
    this.value = new Decimal(value);
  }

  /**
   * Add another Money amount to this amount
   */
  add(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  /**
   * Subtract another Money amount from this amount
   */
  subtract(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  /**
   * Multiply this amount by a factor
   */
  multiply(factor: number): Money {
    return new Money(this.value.times(factor));
  }

  /**
   * Divide this amount by a divisor
   */
  divide(divisor: number): Money {
    return new Money(this.value.dividedBy(divisor));
  }

  /**
   * Check if this amount equals another amount
   */
  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  /**
   * Check if this amount is greater than another amount
   */
  greaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  /**
   * Check if this amount is less than another amount
   */
  lessThan(other: Money): boolean {
    return this.value.lessThan(other.value);
  }

  /**
   * Check if this amount is greater than or equal to another amount
   */
  greaterThanOrEqual(other: Money): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  /**
   * Check if this amount is less than or equal to another amount
   */
  lessThanOrEqual(other: Money): boolean {
    return this.value.lessThanOrEqualTo(other.value);
  }

  /**
   * Check if this amount is zero
   */
  isZero(): boolean {
    return this.value.isZero();
  }

  /**
   * Check if this amount is positive
   */
  isPositive(): boolean {
    return this.value.isPositive();
  }

  /**
   * Check if this amount is negative
   */
  isNegative(): boolean {
    return this.value.isNegative();
  }

  /**
   * Get the absolute value
   */
  abs(): Money {
    return new Money(this.value.abs());
  }

  /**
   * Convert to JavaScript number (use with caution - may lose precision)
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  /**
   * Convert to string with 2 decimal places (for database storage)
   */
  toString(): string {
    return this.value.toFixed(2);
  }

  /**
   * Round to 2 decimal places (for currency safety)
   */
  round(): Money {
    return new Money(this.value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
  }

  /**
   * Ensure currency precision (always round to 2 decimals)
   * This should be called before any database operation
   */
  toCurrencyPrecision(): Money {
    return this.round();
  }

  /**
   * Get the underlying Decimal value (for advanced operations)
   */
  toDecimal(): Decimal {
    return this.value;
  }

  /**
   * Create a Money instance from zero
   */
  static zero(): Money {
    return new Money(0);
  }

  /**
   * Create a Money instance from a number or string
   */
  static from(value: number | string | Decimal): Money {
    return new Money(value);
  }

  toJSON(): number {
    return this.value.toNumber();
  }
}
