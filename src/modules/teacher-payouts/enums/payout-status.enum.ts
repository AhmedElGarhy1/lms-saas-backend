export enum PayoutStatus {
  PENDING = 'PENDING', // Waiting for admin decision
  PAID = 'PAID', // Admin approved and paid - money transferred
  REJECTED = 'REJECTED', // Admin rejected payout (session didn't happen)
}
