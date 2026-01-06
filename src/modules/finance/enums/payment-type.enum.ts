export enum PaymentType {
  INTERNAL = 'INTERNAL', // Wallet transfers, cash transactions (immediate)
  EXTERNAL = 'EXTERNAL', // Bank transfers, payment gateways (async)
}
