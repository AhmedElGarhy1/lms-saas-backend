# Finance Module - Detailed Service and Method Documentation

## Table of Contents
1. [Overview](#overview)
2. [WalletService](#walletservice)
3. [CashboxService](#cashboxservice)
4. [PaymentService](#paymentservice)
5. [TransactionService](#transactionservice)
6. [CashTransactionService](#cashtransactionservice)
7. [Repositories](#repositories)
8. [DTOs and Validators](#dtos-and-validators)

---

## Overview

The Finance Module implements a hybrid financial system managing both virtual credit (Wallets) and physical currency (Cashboxes), linked by Payment records. The module ensures data integrity through pessimistic locking, precise decimal arithmetic, idempotency checks, and comprehensive audit trails.

### Key Features
- **Pessimistic Locking**: All balance updates use database-level pessimistic write locks to prevent race conditions
- **Decimal Precision**: Uses `decimal.js` library via `Money` utility class for safe monetary calculations
- **Escrow Logic**: Implements locked balance mechanism for pending payments
- **Idempotency**: Prevents duplicate payments using idempotency keys
- **Polymorphic References**: Service-level foreign key validation for payment references
- **Split Payments**: Supports correlation IDs for linking multiple transactions to a single payment
- **Signed Amounts**: Transaction statements use sign convention for easier balance calculations

---

## WalletService

**Location**: `src/modules/finance/services/wallet.service.ts`

**Dependencies**:
- `WalletRepository`: Data access layer for wallet entities
- `TransactionRepository`: For retrieving wallet statements

**Purpose**: Manages virtual credit wallets for various owner types (UserProfile, Center, Branch, etc.)

### Methods

#### `getWallet(ownerId: string, ownerType: WalletOwnerType): Promise<Wallet>`

**Description**: Retrieves an existing wallet for a given owner, or creates a new one if it doesn't exist. This method ensures that every owner has exactly one wallet.

**Parameters**:
- `ownerId` (string): The unique identifier of the wallet owner
- `ownerType` (WalletOwnerType): The type of owner (USER_PROFILE, CENTER, BRANCH, etc.)

**Returns**: `Promise<Wallet>` - The wallet entity with zero-initialized balances

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Queries the repository for an existing wallet matching `ownerId` and `ownerType`
2. If no wallet exists, creates a new wallet with:
   - `balance`: `Money.zero()`
   - `bonusBalance`: `Money.zero()`
   - `lockedBalance`: `Money.zero()`
3. Returns the wallet (existing or newly created)

**Use Cases**:
- Initializing wallets for new users/entities
- Retrieving wallet information before balance operations
- Ensuring wallet existence before payment processing

**Error Handling**: None (always succeeds, creates if needed)

---

#### `updateBalance(walletId: string, amount: Money, retryCount = 0): Promise<Wallet>`

**Description**: Updates a wallet's balance atomically using pessimistic locking. Supports automatic retry on lock timeout with exponential backoff.

**Parameters**:
- `walletId` (string): The unique identifier of the wallet to update
- `amount` (Money): The amount to add (positive) or subtract (negative) from the balance
- `retryCount` (number, optional): Internal parameter for retry mechanism (default: 0)

**Returns**: `Promise<Wallet>` - The updated wallet entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Acquires a pessimistic write lock on the wallet row using `findOneWithLock()`
2. **Pre-check**: Calculates the new balance and throws `InsufficientFundsException` if it would be negative
3. Updates the wallet's `balance` field using `Money.add()` for safe decimal arithmetic
4. Saves the wallet using `saveWallet()`
5. **Retry Logic**: If a lock timeout occurs (PostgreSQL error codes `40001` or `40P01`):
   - Waits with exponential backoff: `100ms * 2^retryCount`
   - Retries up to `MAX_RETRIES` (3) times
   - Logs a warning for each retry attempt

**Error Handling**:
- `InsufficientFundsException`: Thrown if the operation would result in a negative balance
- `QueryFailedError`: Handled for lock timeouts with retry mechanism
- Other errors are propagated

**Use Cases**:
- Adding funds to a wallet (positive amount)
- Deducting funds from a wallet (negative amount)
- Transferring funds between wallets
- Completing payments (adding to receiver wallet)

**Concurrency**: Protected by pessimistic write lock to prevent race conditions

---

#### `updateLockedBalance(walletId: string, amount: Money, retryCount = 0): Promise<Wallet>`

**Description**: Updates a wallet's locked balance (escrow) atomically using pessimistic locking. Used for pending payments to hold funds in escrow.

**Parameters**:
- `walletId` (string): The unique identifier of the wallet to update
- `amount` (Money): The amount to add (positive) or subtract (negative) from the locked balance
- `retryCount` (number, optional): Internal parameter for retry mechanism (default: 0)

**Returns**: `Promise<Wallet>` - The updated wallet entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Acquires a pessimistic write lock on the wallet row
2. **Pre-check**: Calculates the new locked balance and throws `InsufficientFundsException` if it would be negative
3. Updates the wallet's `lockedBalance` field using `Money.add()`
4. Saves the wallet
5. **Retry Logic**: Same as `updateBalance()` - exponential backoff on lock timeout

**Error Handling**:
- `InsufficientFundsException`: Thrown if the operation would result in a negative locked balance
- Lock timeout errors are handled with retry mechanism

**Use Cases**:
- Locking funds when creating a pending payment (`createPayment`)
- Unlocking funds when completing a payment (`completePayment`)
- Unlocking funds when cancelling a pending payment (`cancelPayment`)

**Concurrency**: Protected by pessimistic write lock

---

#### `moveFromLockedToBalance(walletId: string, amount: Money): Promise<Wallet>`

**Description**: Atomically moves an amount from `lockedBalance` back to `balance`. Used when cancelling pending payments to restore funds to the payer.

**Parameters**:
- `walletId` (string): The unique identifier of the wallet
- `amount` (Money): The amount to move from locked balance to balance

**Returns**: `Promise<Wallet>` - The updated wallet entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Acquires a pessimistic write lock on the wallet row
2. **Pre-check**: Verifies that `lockedBalance` has sufficient funds (throws `InsufficientFundsException` if not)
3. Subtracts `amount` from `lockedBalance`
4. Adds `amount` to `balance`
5. Saves the wallet
6. **Retry Logic**: Single retry attempt on lock timeout (simpler than other methods)

**Error Handling**:
- `InsufficientFundsException`: Thrown if `lockedBalance` is insufficient
- Lock timeout errors trigger a single retry

**Use Cases**:
- Cancelling pending payments (restoring locked funds to available balance)
- Reversing payment escrow when payment is cancelled

**Concurrency**: Protected by pessimistic write lock

---

#### `getWalletStatement(walletId: string): Promise<TransactionStatement[]>`

**Description**: Retrieves a wallet's transaction history with signed amounts for easier balance calculations.

**Parameters**:
- `walletId` (string): The unique identifier of the wallet

**Returns**: `Promise<TransactionStatement[]>` - Array of transaction statements with signed amounts

**Transaction**: No

**Business Logic**:
1. Delegates to `TransactionRepository.getWalletStatement()`
2. The repository returns transactions where:
   - Transactions where wallet is `fromWalletId`: **negative** signed amount
   - Transactions where wallet is `toWalletId`: **positive** signed amount

**Use Cases**:
- Generating wallet balance history
- Displaying transaction statements to users
- Auditing wallet activity
- Calculating running balances (sum of signed amounts)

**Sign Convention**:
- Outgoing transactions (wallet is sender): Negative amount
- Incoming transactions (wallet is receiver): Positive amount
- This allows simple summation: `balance = sum(signedAmounts)`

---

## CashboxService

**Location**: `src/modules/finance/services/cashbox.service.ts`

**Dependencies**:
- `CashboxRepository`: Data access layer for cashbox entities

**Purpose**: Manages physical cash storage (cashboxes) for branches

### Methods

#### `getCashbox(branchId: string): Promise<Cashbox>`

**Description**: Retrieves an existing cashbox for a given branch, or creates a new one if it doesn't exist. Ensures one cashbox per branch.

**Parameters**:
- `branchId` (string): The unique identifier of the branch

**Returns**: `Promise<Cashbox>` - The cashbox entity with zero-initialized balance

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Queries the repository for an existing cashbox matching `branchId`
2. If no cashbox exists, creates a new cashbox with:
   - `branchId`: The provided branch ID
   - `balance`: `Money.zero()`
3. Returns the cashbox (existing or newly created)

**Use Cases**:
- Initializing cashboxes for new branches
- Retrieving cashbox information before cash operations
- Ensuring cashbox existence before processing cash deposits

**Error Handling**: None (always succeeds, creates if needed)

---

#### `updateBalance(cashboxId: string, amount: Money, retryCount = 0): Promise<Cashbox>`

**Description**: Updates a cashbox's balance atomically using pessimistic locking. Supports automatic retry on lock timeout.

**Parameters**:
- `cashboxId` (string): The unique identifier of the cashbox to update
- `amount` (Money): The amount to add (positive) or subtract (negative) from the balance
- `retryCount` (number, optional): Internal parameter for retry mechanism (default: 0)

**Returns**: `Promise<Cashbox>` - The updated cashbox entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Acquires a pessimistic write lock on the cashbox row using `findOneWithLock()`
2. **Pre-check**: Calculates the new balance and throws `InsufficientFundsException` if it would be negative
3. Updates the cashbox's `balance` field using `Money.add()`
4. Saves the cashbox using `saveCashbox()`
5. **Retry Logic**: Same as `WalletService.updateBalance()` - exponential backoff on lock timeout

**Error Handling**:
- `InsufficientFundsException`: Thrown if the operation would result in a negative balance
- Lock timeout errors are handled with retry mechanism

**Use Cases**:
- Recording cash deposits (positive amount)
- Recording cash withdrawals (negative amount)
- Processing cash payments
- Reversing cash transactions

**Concurrency**: Protected by pessimistic write lock

---

#### `audit(cashboxId: string): Promise<Cashbox>`

**Description**: Records an audit timestamp for a cashbox. Used for periodic cash audits to track when the cashbox was last verified.

**Parameters**:
- `cashboxId` (string): The unique identifier of the cashbox to audit

**Returns**: `Promise<Cashbox>` - The updated cashbox entity with updated `lastAuditedAt` timestamp

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves the cashbox using `findOneOrThrow()` (throws if not found)
2. Sets `lastAuditedAt` to the current timestamp
3. Saves the cashbox

**Use Cases**:
- Recording periodic cash audits
- Tracking cashbox verification history
- Compliance and audit trail requirements

**Error Handling**:
- Throws error if cashbox not found (via `findOneOrThrow`)

---

## PaymentService

**Location**: `src/modules/finance/services/payment.service.ts`

**Dependencies**:
- `PaymentRepository`: Data access layer for payment entities
- `WalletService`: For wallet balance operations
- `CashboxService`: For cashbox balance operations
- `TransactionService`: For transaction creation and validation
- `CashTransactionService`: For cash transaction creation and reversal

**Purpose**: Orchestrates payment processing, managing payment lifecycle, balance updates, and business logic validation

### Methods

#### `getCreatedByProfileId(): string` (Private)

**Description**: Helper method to determine the profile ID that created a payment. Uses `RequestContext` if available, otherwise falls back to `SYSTEM_USER_ID`.

**Returns**: `string` - The profile ID of the creator

**Business Logic**:
1. Retrieves `RequestContext` from the current request
2. Returns `ctx.userProfileId` if available
3. Otherwise returns `SYSTEM_USER_ID` for system-initiated actions

**Use Cases**: Internal method used by payment creation methods to set `createdByProfileId`

---

#### `createPayment(...): Promise<Payment>`

**Description**: Creates a new payment record with `PENDING` status. Implements escrow logic for wallet payments by moving funds from `balance` to `lockedBalance`. Supports idempotency to prevent duplicate payments.

**Parameters**:
- `amount` (Money): Payment amount
- `payerProfileId` (string): Profile ID of the payer
- `receiverId` (string): ID of the payment receiver
- `receiverType` (WalletOwnerType): Type of receiver (USER_PROFILE, CENTER, etc.)
- `reason` (PaymentReason): Reason for payment (SESSION, TOPUP, etc.)
- `source` (PaymentSource): Payment source (WALLET or CASH)
- `referenceType` (PaymentReferenceType, optional): Type of reference transaction
- `referenceId` (string, optional): ID of reference transaction
- `correlationId` (string, optional): Correlation ID for split payments
- `idempotencyKey` (string, optional): Idempotency key to prevent duplicates

**Returns**: `Promise<Payment>` - The created payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. **Idempotency Check**: If `idempotencyKey` is provided:
   - Queries for existing payments with the same `idempotencyKey` and `payerProfileId`
   - If found, returns the existing payment (prevents duplicate creation)
2. **Escrow Logic** (if `source === PaymentSource.WALLET`):
   - Retrieves payer's wallet using `getWallet()`
   - **Pre-check**: Verifies available balance (`balance - lockedBalance >= amount`)
   - Throws `InsufficientFundsException` if insufficient
   - Deducts `amount` from `balance` using `updateBalance()`
   - Adds `amount` to `lockedBalance` using `updateLockedBalance()`
3. Creates payment record with:
   - `status`: `PENDING`
   - `correlationId`: Provided or auto-generated UUID
   - `createdByProfileId`: From `getCreatedByProfileId()`
4. Returns the created payment

**Error Handling**:
- `InsufficientFundsException`: Thrown if payer has insufficient available balance
- Idempotency: Returns existing payment instead of creating duplicate

**Use Cases**:
- Creating pending wallet payments
- Initiating payment flows that require approval
- Processing payments that need to be completed later

**Escrow Mechanism**: Funds are locked in `lockedBalance` until payment is completed or cancelled

---

#### `getPayment(paymentId: string): Promise<Payment>`

**Description**: Retrieves a single payment by its ID. Throws an error if not found.

**Parameters**:
- `paymentId` (string): The unique identifier of the payment

**Returns**: `Promise<Payment>` - The payment entity

**Transaction**: No

**Business Logic**:
1. Uses `paymentRepository.findOneOrThrow()` to retrieve the payment
2. Returns the payment entity

**Error Handling**: Throws error if payment not found (via `findOneOrThrow`)

**Use Cases**:
- Retrieving payment details for display
- Validating payment existence before operations
- API endpoints for payment lookup

---

#### `validateReference(referenceType: PaymentReferenceType, referenceId: string): Promise<boolean>`

**Description**: Validates that a payment's reference (Transaction or CashTransaction) exists. Implements service-level foreign key validation for polymorphic references.

**Parameters**:
- `referenceType` (PaymentReferenceType): Type of reference (TRANSACTION or CASH_TRANSACTION)
- `referenceId` (string): ID of the reference entity

**Returns**: `Promise<boolean>` - `true` if reference exists

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. If `referenceType === TRANSACTION`:
   - Calls `transactionService.transactionExists(referenceId)`
   - Throws `BusinessLogicException` if transaction doesn't exist
2. If `referenceType === CASH_TRANSACTION`:
   - Calls `cashTransactionService.cashTransactionExists(referenceId)`
   - Throws `BusinessLogicException` if cash transaction doesn't exist
3. Returns `true` if validation passes

**Error Handling**:
- `BusinessLogicException`: Thrown if reference doesn't exist

**Use Cases**:
- Validating payment references before completing payments
- Ensuring data integrity for polymorphic relationships
- Preventing orphaned payment records

---

#### `completePayment(paymentId: string): Promise<Payment>`

**Description**: Completes a pending payment, updating balances and setting `paidAt` timestamp. Moves funds from escrow to receiver for wallet payments.

**Parameters**:
- `paymentId` (string): The unique identifier of the payment to complete

**Returns**: `Promise<Payment>` - The completed payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves payment using `findOneOrThrow()`
2. **Status Validation**: Verifies payment status is `PENDING` (throws `BusinessLogicException` if not)
3. **Reference Validation**: If payment has a reference, validates it exists using `validateReference()`
4. **Balance Updates** (if `source === PaymentSource.WALLET`):
   - Retrieves payer's wallet
   - Deducts `amount` from payer's `lockedBalance` (unlocking escrow)
   - Retrieves receiver's wallet
   - Adds `amount` to receiver's `balance`
5. Updates payment:
   - `status`: `COMPLETED`
   - `paidAt`: Current timestamp
6. Saves and returns the payment

**Error Handling**:
- `BusinessLogicException`: Thrown if payment is not in `PENDING` status
- `BusinessLogicException`: Thrown if reference validation fails

**Use Cases**:
- Completing pending wallet payments
- Finalizing payment flows after approval
- Processing confirmed payments

**Balance Flow**:
- Payer: `lockedBalance` decreases (escrow released)
- Receiver: `balance` increases (funds received)

---

#### `cancelPayment(paymentId: string): Promise<Payment>`

**Description**: Cancels a payment, reversing balance changes based on payment status. Handles both `PENDING` and `COMPLETED` payments.

**Parameters**:
- `paymentId` (string): The unique identifier of the payment to cancel

**Returns**: `Promise<Payment>` - The cancelled payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves payment using `findOneOrThrow()`
2. **Early Return**: If payment is already `CANCELLED`, returns immediately
3. **Handle PENDING Payments** (if `status === PENDING` and `source === WALLET`):
   - Retrieves payer's wallet
   - Moves `amount` from `lockedBalance` back to `balance` using `moveFromLockedToBalance()`
4. **Handle COMPLETED Payments** (if `status === COMPLETED`):
   - **Wallet Payments**: Reverses balances:
     - Adds `amount` back to payer's `balance`
     - Deducts `amount` from receiver's `balance`
   - **Cash Payments**: Reverses cash transaction if reference exists:
     - Calls `cashTransactionService.reverseCashTransaction()`
5. Updates payment:
   - `status`: `CANCELLED`
6. Saves and returns the payment

**Error Handling**: None (always succeeds, handles all statuses gracefully)

**Use Cases**:
- Cancelling pending payments (restores escrow)
- Reversing completed payments (refunds)
- Handling payment disputes
- Correcting payment errors

**Balance Flow**:
- **PENDING → CANCELLED**: Escrow restored to payer's balance
- **COMPLETED → CANCELLED**: Full reversal (payer refunded, receiver debited)

---

#### `refundPayment(paymentId: string): Promise<Payment>`

**Description**: Refunds a completed payment, reversing all balance changes. Only works on `COMPLETED` payments.

**Parameters**:
- `paymentId` (string): The unique identifier of the payment to refund

**Returns**: `Promise<Payment>` - The refunded payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves payment using `findOneOrThrow()`
2. **Status Validation**: Verifies payment status is `COMPLETED` (throws `BusinessLogicException` if not)
3. **Balance Reversal**:
   - **Wallet Payments**: 
     - Adds `amount` back to payer's `balance` (refund)
     - Deducts `amount` from receiver's `balance` (reversal)
   - **Cash Payments**: 
     - Reverses cash transaction if reference exists using `reverseCashTransaction()`
4. Updates payment:
   - `status`: `REFUNDED`
5. Saves and returns the payment

**Error Handling**:
- `BusinessLogicException`: Thrown if payment is not `COMPLETED`

**Use Cases**:
- Processing refunds for completed payments
- Handling customer refund requests
- Reversing erroneous payments

**Balance Flow**:
- Payer: `balance` increases (refunded)
- Receiver: `balance` decreases (reversed)

---

#### `processCashDeposit(...): Promise<Payment>`

**Description**: Processes a cash deposit from a student/payer. Creates a cash transaction, updates cashbox balance, and creates a completed payment record.

**Parameters**:
- `branchId` (string): Branch where cash is deposited
- `amount` (Money): Deposit amount
- `payerProfileId` (string): Profile ID of the payer
- `receiverId` (string): ID of the payment receiver
- `receiverType` (WalletOwnerType): Type of receiver
- `receivedByProfileId` (string): Profile ID of staff member who received the cash
- `idempotencyKey` (string, optional): Idempotency key to prevent duplicates

**Returns**: `Promise<Payment>` - The completed payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. **Idempotency Check**: If `idempotencyKey` provided, checks for existing payment and returns it if found
2. **Cashbox Management**: Gets or creates cashbox for the branch using `getCashbox()`
3. **Cash Transaction**: Creates cash transaction with:
   - `direction`: `IN` (cash coming into cashbox)
   - `type`: `DEPOSIT`
   - `receivedByProfileId`: Staff member who processed the deposit
4. **Balance Update**: Updates cashbox balance using `updateBalance()` (adds amount)
5. **Payment Creation**: Creates payment record with:
   - `status`: `COMPLETED` (cash payments are immediately completed)
   - `source`: `CASH`
   - `reason`: `TOPUP`
   - `referenceType`: `CASH_TRANSACTION`
   - `referenceId`: ID of created cash transaction
   - `paidAt`: Current timestamp
6. Returns the payment

**Error Handling**:
- Idempotency: Returns existing payment instead of creating duplicate
- Lock timeouts: Handled by `updateBalance()` retry mechanism

**Use Cases**:
- Students paying cash for sessions/top-ups
- Recording physical cash deposits
- Processing cash payments at branches

**Balance Flow**:
- Cashbox: `balance` increases (cash received)
- Payment: Immediately `COMPLETED` (no escrow for cash)

---

#### `processWalletTransfer(...): Promise<Payment>`

**Description**: Processes an internal wallet-to-wallet transfer. Creates a transaction record and updates both wallets atomically.

**Parameters**:
- `fromWalletId` (string): Source wallet ID
- `toWalletId` (string): Destination wallet ID
- `amount` (Money): Transfer amount
- `payerProfileId` (string): Profile ID of the payer
- `receiverId` (string): ID of the receiver
- `receiverType` (WalletOwnerType): Type of receiver

**Returns**: `Promise<Payment>` - The completed payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. **Transaction Creation**: Creates a transaction record with:
   - `fromWalletId`: Source wallet
   - `toWalletId`: Destination wallet
   - `type`: `INTERNAL_TRANSFER`
2. **Balance Updates**: Updates both wallets atomically:
   - Deducts `amount` from `fromWalletId` using `updateBalance()`
   - Adds `amount` to `toWalletId` using `updateBalance()`
3. **Payment Creation**: Creates payment record with:
   - `status`: `COMPLETED`
   - `source`: `WALLET`
   - `reason`: `INTERNAL_TRANSFER`
   - `referenceType`: `TRANSACTION`
   - `referenceId`: ID of created transaction
   - `paidAt`: Current timestamp
4. Returns the payment

**Error Handling**:
- `InsufficientFundsException`: Thrown if source wallet has insufficient balance (via `updateBalance()`)
- Lock timeouts: Handled by retry mechanism in `updateBalance()`

**Use Cases**:
- Transferring funds between user wallets
- Internal system transfers
- Wallet-to-wallet payments

**Balance Flow**:
- Source wallet: `balance` decreases
- Destination wallet: `balance` increases
- Payment: Immediately `COMPLETED`

---

#### `processSplitPayment(...): Promise<Payment>`

**Description**: Processes a split payment where a single payment amount is distributed across multiple transactions. Validates that the sum of split transactions equals the payment amount.

**Parameters**:
- `transactions` (Array): Array of transaction data objects:
  - `fromWalletId` (string, optional): Source wallet
  - `toWalletId` (string, optional): Destination wallet
  - `amount` (Money): Transaction amount
  - `type` (TransactionType): Transaction type
- `payerProfileId` (string): Profile ID of the payer
- `receiverId` (string): ID of the receiver
- `receiverType` (WalletOwnerType): Type of receiver
- `reason` (PaymentReason): Payment reason
- `correlationId` (string, optional): Correlation ID for linking transactions

**Returns**: `Promise<Payment>` - The completed payment entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. **Correlation ID**: Uses provided `correlationId` or generates a new UUID
2. **Transaction Creation**: Creates all split transactions using `createSplitTransactions()`:
   - All transactions share the same `correlationId`
   - Each transaction is created individually
3. **Amount Calculation**: Calculates total amount from all transactions
4. **Balance Updates**: Updates all wallets involved in split transactions:
   - Deducts from `fromWalletId` wallets (if specified)
   - Adds to `toWalletId` wallets (if specified)
5. **Payment Creation**: Creates payment record with:
   - `amount`: Total amount of all split transactions
   - `status`: `COMPLETED`
   - `source`: `WALLET`
   - `referenceType`: `TRANSACTION`
   - `referenceId`: ID of first transaction (for reference)
   - `correlationId`: Shared correlation ID
   - `paidAt`: Current timestamp
6. **Validation**: Validates that sum of transactions with `correlationId` equals payment amount using `validateCorrelationSum()`
7. Returns the payment

**Error Handling**:
- `BusinessLogicException`: Thrown if transaction sum doesn't match payment amount
- `InsufficientFundsException`: Thrown if any source wallet has insufficient balance

**Use Cases**:
- Splitting payments across multiple wallets
- Distributing payments to multiple recipients
- Complex payment scenarios requiring multiple transactions

**Balance Flow**:
- Multiple wallets updated based on transaction data
- Payment amount equals sum of all transaction amounts

---

#### `paginatePayments(dto: PaginatePaymentDto): Promise<Pagination<Payment>>`

**Description**: Retrieves a paginated list of payments with optional filtering and sorting.

**Parameters**:
- `dto` (PaginatePaymentDto): Pagination and filter parameters:
  - `status` (PaymentStatus, optional): Filter by payment status
  - `reason` (PaymentReason, optional): Filter by payment reason
  - `source` (PaymentSource, optional): Filter by payment source
  - `payerProfileId` (string, optional): Filter by payer profile ID
  - Standard pagination fields (page, limit, search, sort, etc.)

**Returns**: `Promise<Pagination<Payment>>` - Paginated payment results with metadata

**Transaction**: No

**Business Logic**:
1. Creates a query builder for payments
2. **Filters**: Applies optional filters:
   - `status`: `WHERE payment.status = :status`
   - `reason`: `WHERE payment.reason = :reason`
   - `source`: `WHERE payment.source = :source`
   - `payerProfileId`: `WHERE payment.payerProfileId = :payerProfileId`
3. **Pagination**: Uses `paymentRepository.paginate()` with:
   - Searchable columns: `['reason', 'status']`
   - Sortable columns: `['createdAt', 'amount', 'status']`
   - Default sort: `['createdAt', 'DESC']`
4. Returns paginated results with metadata and navigation links

**Use Cases**:
- Listing payments in admin panels
- Payment history for users
- Reporting and analytics
- Payment search and filtering

**Pagination**: Supports standard pagination with search, sort, and filter capabilities

---

## TransactionService

**Location**: `src/modules/finance/services/transaction.service.ts`

**Dependencies**:
- `TransactionRepository`: Data access layer for transaction entities

**Purpose**: Manages digital wallet transactions (virtual credit movements)

### Methods

#### `createTransaction(...): Promise<Transaction>`

**Description**: Creates a single transaction record linking two wallets (or one wallet for system transactions).

**Parameters**:
- `fromWalletId` (string | null): Source wallet ID (null for system transactions)
- `toWalletId` (string | null): Destination wallet ID (null for system transactions)
- `amount` (Money): Transaction amount
- `type` (TransactionType): Type of transaction
- `correlationId` (string, optional): Correlation ID for linking related transactions

**Returns**: `Promise<Transaction>` - The created transaction entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Creates transaction record with:
   - `fromWalletId`: Provided or `undefined` if null
   - `toWalletId`: Provided or `undefined` if null
   - `amount`: Transaction amount
   - `type`: Transaction type
   - `correlationId`: Provided or auto-generated UUID
2. Returns the created transaction

**Use Cases**:
- Recording wallet-to-wallet transfers
- Creating transaction history
- Linking transactions for split payments

**Note**: This method only creates the record; balance updates are handled separately by `WalletService`

---

#### `createSplitTransactions(...): Promise<Transaction[]>`

**Description**: Creates multiple transaction records sharing the same `correlationId`. Used for split payments.

**Parameters**:
- `transactions` (Array): Array of transaction data objects:
  - `fromWalletId` (string, optional): Source wallet
  - `toWalletId` (string, optional): Destination wallet
  - `amount` (Money): Transaction amount
  - `type` (TransactionType): Transaction type
- `correlationId` (string, optional): Shared correlation ID

**Returns**: `Promise<Transaction[]>` - Array of created transaction entities

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Generates shared `correlationId` if not provided
2. Iterates through transaction data array
3. For each transaction, calls `createTransaction()` with the shared `correlationId`
4. Collects all created transactions
5. Returns the array of transactions

**Use Cases**:
- Creating split payment transactions
- Linking multiple transactions to a single payment
- Complex payment scenarios

**Correlation**: All transactions share the same `correlationId` for grouping

---

#### `validateCorrelationSum(correlationId: string, expectedAmount: Money): Promise<boolean>`

**Description**: Validates that the sum of all transactions with a given `correlationId` equals the expected payment amount. Ensures data integrity for split payments.

**Parameters**:
- `correlationId` (string): Correlation ID to validate
- `expectedAmount` (Money): Expected total amount

**Returns**: `Promise<boolean>` - `true` if validation passes

**Transaction**: No

**Business Logic**:
1. Retrieves all transactions with the given `correlationId` using `findByCorrelationId()`
2. **Empty Check**: Throws `BusinessLogicException` if no transactions found
3. **Sum Calculation**: Sums all transaction amounts using `Money.add()`
4. **Validation**: Compares sum to `expectedAmount`:
   - Throws `BusinessLogicException` if amounts don't match
   - Returns `true` if amounts match

**Error Handling**:
- `BusinessLogicException`: Thrown if no transactions found or sum doesn't match

**Use Cases**:
- Validating split payment integrity
- Ensuring payment amounts match transaction sums
- Data integrity checks

---

#### `reverseTransaction(transactionId: string): Promise<Transaction>`

**Description**: Creates a reverse transaction for cancellation purposes. Swaps `fromWalletId` and `toWalletId` to reverse the original transaction.

**Parameters**:
- `transactionId` (string): ID of the transaction to reverse

**Returns**: `Promise<Transaction>` - The reverse transaction entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves the original transaction using `findOne()`
2. **Not Found Check**: Throws error if transaction doesn't exist
3. Creates a new transaction with:
   - `fromWalletId`: Original transaction's `toWalletId`
   - `toWalletId`: Original transaction's `fromWalletId`
   - `amount`: Original transaction's `amount`
   - `type`: Original transaction's `type`
4. Returns the reverse transaction

**Error Handling**: Throws error if original transaction not found

**Use Cases**:
- Reversing transactions for payment cancellation
- Creating audit trail for reversals
- Correcting transaction errors

**Note**: This method only creates the reverse record; balance updates are handled separately

---

#### `findByCorrelationId(correlationId: string): Promise<Transaction[]>`

**Description**: Retrieves all transactions sharing a given `correlationId`.

**Parameters**:
- `correlationId` (string): Correlation ID to search for

**Returns**: `Promise<Transaction[]>` - Array of transaction entities

**Transaction**: No

**Business Logic**:
1. Delegates to `transactionRepository.findByCorrelationId()`
2. Returns all transactions with matching `correlationId`

**Use Cases**:
- Retrieving split payment transactions
- Grouping related transactions
- Transaction history queries

---

#### `transactionExists(transactionId: string): Promise<boolean>`

**Description**: Checks if a transaction exists. Used for reference validation.

**Parameters**:
- `transactionId` (string): Transaction ID to check

**Returns**: `Promise<boolean>` - `true` if transaction exists

**Transaction**: No

**Business Logic**:
1. Attempts to find transaction using `findOne()`
2. Returns `true` if found, `false` otherwise

**Use Cases**:
- Validating payment references
- Checking transaction existence before operations
- Service-level foreign key validation

---

## CashTransactionService

**Location**: `src/modules/finance/services/cash-transaction.service.ts`

**Dependencies**:
- `CashTransactionRepository`: Data access layer for cash transaction entities

**Purpose**: Manages physical cash transactions (cash movements in/out of cashboxes)

### Methods

#### `createCashTransaction(...): Promise<CashTransaction>`

**Description**: Creates a cash transaction record for physical cash movements.

**Parameters**:
- `branchId` (string): Branch where transaction occurred
- `cashboxId` (string): Cashbox involved in transaction
- `amount` (Money): Transaction amount
- `direction` (CashTransactionDirection): Direction (`IN` or `OUT`)
- `receivedByProfileId` (string): Profile ID of staff member who processed the cash
- `type` (CashTransactionType): Type of transaction (DEPOSIT, WITHDRAWAL, etc.)

**Returns**: `Promise<CashTransaction>` - The created cash transaction entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Creates cash transaction record with all provided parameters
2. Returns the created transaction

**Use Cases**:
- Recording cash deposits
- Recording cash withdrawals
- Tracking physical cash movements
- Creating cash transaction history

**Note**: This method only creates the record; cashbox balance updates are handled separately by `CashboxService`

---

#### `reverseCashTransaction(cashTransactionId: string): Promise<CashTransaction>`

**Description**: Creates a reverse cash transaction with opposite direction. Used for cancellation/refund scenarios.

**Parameters**:
- `cashTransactionId` (string): ID of the cash transaction to reverse

**Returns**: `Promise<CashTransaction>` - The reverse cash transaction entity

**Transaction**: Yes (`@Transactional()`)

**Business Logic**:
1. Retrieves the original cash transaction using `findOne()`
2. **Not Found Check**: Throws `ResourceNotFoundException` if transaction doesn't exist
3. Determines reverse direction:
   - If original is `IN`, reverse is `OUT`
   - If original is `OUT`, reverse is `IN`
4. Creates a new cash transaction with:
   - Same `branchId`, `cashboxId`, `amount`, `type`, `receivedByProfileId`
   - Opposite `direction`
5. Returns the reverse transaction

**Error Handling**:
- `ResourceNotFoundException`: Thrown if original transaction not found

**Use Cases**:
- Reversing cash deposits (refunds)
- Reversing cash withdrawals
- Correcting cash transaction errors
- Payment cancellation for cash payments

**Note**: This method only creates the reverse record; cashbox balance updates are handled separately

---

#### `cashTransactionExists(cashTransactionId: string): Promise<boolean>`

**Description**: Checks if a cash transaction exists. Used for reference validation.

**Parameters**:
- `cashTransactionId` (string): Cash transaction ID to check

**Returns**: `Promise<boolean>` - `true` if cash transaction exists

**Transaction**: No

**Business Logic**:
1. Attempts to find cash transaction using `findOne()`
2. Returns `true` if found, `false` otherwise

**Use Cases**:
- Validating payment references
- Checking cash transaction existence before operations
- Service-level foreign key validation

---

## Repositories

### WalletRepository

**Location**: `src/modules/finance/repositories/wallet.repository.ts`

**Methods**:
- `findByOwner(ownerId, ownerType)`: Finds wallet by owner ID and type
- `findOneWithLock(walletId)`: Retrieves wallet with pessimistic write lock
- `saveWallet(wallet)`: Saves wallet entity
- `updateBalance(walletId, balance)`: Updates wallet balance (deprecated, use service methods)

**Purpose**: Data access layer for wallet entities with pessimistic locking support

---

### CashboxRepository

**Location**: `src/modules/finance/repositories/cashbox.repository.ts`

**Methods**:
- `findByBranchId(branchId)`: Finds cashbox by branch ID
- `findOneWithLock(cashboxId)`: Retrieves cashbox with pessimistic write lock
- `saveCashbox(cashbox)`: Saves cashbox entity
- `updateBalance(cashboxId, balance)`: Updates cashbox balance (deprecated, use service methods)

**Purpose**: Data access layer for cashbox entities with pessimistic locking support

---

### PaymentRepository

**Location**: `src/modules/finance/repositories/payment.repository.ts`

**Methods**:
- `findByStatus(status)`: Finds payments by status
- `findByReference(referenceType, referenceId)`: Finds payment by reference
- `findByCorrelationId(correlationId)`: Finds payments by correlation ID
- `findByIdempotencyKey(idempotencyKey, payerProfileId)`: Finds payments by idempotency key
- `savePayment(payment)`: Saves payment entity
- `createQueryBuilder(alias)`: Creates query builder for pagination

**Purpose**: Data access layer for payment entities with query capabilities

---

### TransactionRepository

**Location**: `src/modules/finance/repositories/transaction.repository.ts`

**Methods**:
- `findByWallet(walletId)`: Finds transactions involving a wallet
- `getWalletStatement(walletId)`: Gets wallet statement with signed amounts
- `findByCorrelationId(correlationId)`: Finds transactions by correlation ID

**Purpose**: Data access layer for transaction entities with statement generation

---

### CashTransactionRepository

**Location**: `src/modules/finance/repositories/cash-transaction.repository.ts`

**Methods**:
- `findByCashbox(cashboxId)`: Finds cash transactions by cashbox
- `findByBranch(branchId)`: Finds cash transactions by branch

**Purpose**: Data access layer for cash transaction entities

---

## DTOs and Validators

### Applied Validators

The finance module DTOs use the following validators for data integrity:

#### CreatePaymentDto
- `payerProfileId`: `@Exists(UserProfile)` - Validates payer profile exists
- `referenceId`: Conditional validation based on `referenceType`

#### CreateTransactionDto
- `fromWalletId`: `@Exists(Wallet)` - Validates source wallet exists
- `toWalletId`: `@Exists(Wallet)` - Validates destination wallet exists

#### CreateCashTransactionDto
- `branchId`: `@BelongsToBranch(Branch)` - Validates branch belongs to current center
- `cashboxId`: `@Exists(Cashbox)` - Validates cashbox exists
- `receivedByProfileId`: `@Exists(UserProfile)` + `@IsProfileType(ProfileType.STAFF)` - Validates staff member exists

#### TransferWalletDto
- `fromWalletId`: `@Exists(Wallet)` - Validates source wallet exists
- `toWalletId`: `@Exists(Wallet)` - Validates destination wallet exists

#### CashDepositDto
- `branchId`: `@BelongsToBranch(Branch)` - Validates branch belongs to current center
- `payerProfileId`: `@Exists(UserProfile)` - Validates payer profile exists
- `receiverId`: `@Exists(UserProfile)` - Validates receiver profile exists

#### WalletStatementDto
- `walletId`: `@Exists(Wallet)` - Validates wallet exists

---

## Summary

The Finance Module provides a robust, production-ready financial system with:

1. **Concurrency Safety**: Pessimistic locking prevents race conditions
2. **Precision**: Decimal arithmetic ensures accurate monetary calculations
3. **Integrity**: Service-level validation and idempotency prevent data corruption
4. **Audit Trail**: Comprehensive transaction history with correlation IDs
5. **Flexibility**: Supports both virtual and physical currency flows
6. **Validation**: DTO-level validators ensure data integrity at the API boundary

All services follow the repository pattern, with data access encapsulated in repository classes and business logic in service classes. The module is fully transactional, ensuring atomicity of all financial operations.

