export enum PayoutStatus {
  PENDING = 'PENDING', // Waiting for admin approval (SESSION/HOUR payouts)
  INSTALLMENT = 'INSTALLMENT', // Installments in progress (CLASS payouts - automatic)
  PAID = 'PAID', // Fully paid - money transferred
}
