export enum AbsenteePolicy {
  /**
   * STRICT: All bookings are charged at session start.
   * Guaranteed revenue. Best for crowded classes where seats are precious.
   */
  STRICT = 'STRICT',

  /**
   * FLEXIBLE: Only students who scan the QR are charged.
   * Student-friendly. Best for new teachers building a student base.
   */
  FLEXIBLE = 'FLEXIBLE',

  /**
   * MANUAL: The secretary decides at the end of the day.
   * High control. Best for small, personalized centers.
   */
  MANUAL = 'MANUAL',
}
