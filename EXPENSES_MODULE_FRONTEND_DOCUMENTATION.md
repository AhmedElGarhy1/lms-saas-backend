# Expenses Module - Frontend Integration Guide

## Overview

A new **Expenses Module** has been added to allow centers to track and manage their expenses. Expenses are **cash-only payments** that are automatically paid when created. The module supports creating expenses, updating metadata, and refunding expenses.

**Base URL**: `/api/expenses` (not `/api/finance/expenses`)

---

## New Endpoints

### 1. Create Expense

**Endpoint**: `POST /api/expenses`

**Permission Required**: `expenses:create`

**Description**: Creates a new expense and immediately creates a CASH payment from the branch cashbox. The expense is automatically paid upon creation.

**Request Body**:

```typescript
{
  centerId?: string;        // Optional - uses context center if not provided
  branchId: string;         // Required - determines which cashbox to debit from
  category: ExpenseCategory; // Required - see categories below
  title: string;            // Required - max 255 characters
  description?: string;      // Optional
  amount: number;           // Required - minimum 0.01, max 2 decimal places
}
```

**Response** (201 Created):

```typescript
{
  success: true,
  data: {
    id: string;
    centerId: string;
    branchId?: string;
    category: ExpenseCategory;
    title: string;
    description?: string;
    amount: string;          // Decimal as string (e.g., "150.50")
    status: "PAID";         // Always PAID when created
    paymentId: string;      // Link to the created payment
    paidAt: string;         // ISO 8601 timestamp
    createdAt: string;
    updatedAt: string;
    createdByProfileId: string;
    updatedByProfileId?: string;
  }
}
```

**Error Responses**:

- `400` - Invalid request data (validation errors)
- `403` - Insufficient permissions or no center/branch access
- `404` - Center or branch not found

---

### 2. List Expenses

**Endpoint**: `GET /api/expenses`

**Permission Required**: `expenses:view`

**Description**: Get paginated list of expenses with filtering options.

**Query Parameters**:

```typescript
{
  page?: number;              // Default: 1
  limit?: number;             // Default: 10, max: 50
  search?: string;            // Search in title/description
  sortBy?: string;            // Format: "field:DIRECTION" (e.g., "createdAt:DESC")
  dateFrom?: string;         // ISO 8601 date
  dateTo?: string;           // ISO 8601 date
  centerId?: string;         // Filter by center
  branchId?: string;         // Filter by branch
  status?: ExpenseStatus;    // Filter by status (PAID, REFUNDED)
  category?: ExpenseCategory; // Filter by category
}
```

**Response** (200 OK):

```typescript
{
  success: true,
  data: {
    items: ExpenseResponseDto[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
    links: {
      first: string;
      previous?: string;
      next?: string;
      last: string;
    };
  }
}
```

---

### 3. Get Expense Details

**Endpoint**: `GET /api/expenses/:id`

**Permission Required**: `expenses:view`

**Description**: Get detailed information about a specific expense.

**Response** (200 OK):

```typescript
{
  success: true,
  data: ExpenseResponseDto
}
```

**Error Responses**:

- `404` - Expense not found or not accessible

---

### 4. Update Expense

**Endpoint**: `PATCH /api/expenses/:id`

**Permission Required**: `expenses:update`

**Description**: Update expense metadata. **Cannot update amount or branchId after payment is created.** Only metadata fields can be updated.

**Request Body** (all fields optional):

```typescript
{
  category?: ExpenseCategory;
  title?: string;            // Max 255 characters
  description?: string;
}
```

**Response** (200 OK):

```typescript
{
  success: true,
  data: ExpenseResponseDto
}
```

**Error Responses**:

- `400` - Invalid request data or expense is refunded (cannot update refunded expenses)
- `403` - Insufficient permissions or no center access
- `404` - Expense not found

**Important Notes**:

- Cannot update `amount` or `branchId` after creation
- Cannot update if expense status is `REFUNDED`

---

### 5. Refund Expense

**Endpoint**: `POST /api/expenses/:id/refund`

**Permission Required**: `expenses:refund`

**Description**: Refund an expense payment. This reverses the cash transaction and credits the amount back to the branch cashbox.

**Request Body**: None (empty body)

**Response** (200 OK):

```typescript
{
  success: true,
  data: {
    ...ExpenseResponseDto,
    status: "REFUNDED"  // Status changed to REFUNDED
  }
}
```

**Error Responses**:

- `400` - Expense is already refunded or not paid (only PAID expenses can be refunded)
- `403` - Insufficient permissions or no center access
- `404` - Expense not found

---

## Enums

### ExpenseStatus

```typescript
enum ExpenseStatus {
  PAID = 'PAID', // Expense created and paid immediately
  REFUNDED = 'REFUNDED', // Payment refunded (reversed)
}
```

### ExpenseCategory

```typescript
enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES', // Electricity, water, internet
  SUPPLIES = 'SUPPLIES', // Office supplies, teaching materials
  SALARIES = 'SALARIES', // Staff salaries (non-teacher)
  MARKETING = 'MARKETING', // Advertising, promotions
  MAINTENANCE = 'MAINTENANCE', // Building/equipment maintenance
  TRANSPORTATION = 'TRANSPORTATION',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES',
  OTHER = 'OTHER',
}
```

---

## Permissions

The following permissions have been added to the permissions system:

```typescript
PERMISSIONS.EXPENSES = {
  CREATE: { action: 'expenses:create', scope: 'CENTER' },
  VIEW: { action: 'expenses:view', scope: 'CENTER' },
  UPDATE: { action: 'expenses:update', scope: 'CENTER' },
  REFUND: { action: 'expenses:refund', scope: 'CENTER' },
};
```

All permissions have `CENTER` scope, meaning they require center access.

---

## Important Behavior Notes

### 1. Auto-Payment on Creation

- When an expense is created, it **immediately creates a CASH payment**
- The payment is automatically completed (status: COMPLETED)
- The expense status is set to `PAID` immediately
- The amount is debited from the branch cashbox

### 2. Cash-Only Payments

- **All expenses are cash payments only** (no wallet payments)
- The `paymentMethod` is always `CASH`
- Payment is made from the branch cashbox

### 3. Update Restrictions

- **Cannot update** `amount` or `branchId` after creation
- **Cannot update** if expense status is `REFUNDED`
- Only these fields can be updated: `title`, `description`, `category`

### 4. Refund Behavior

- Only expenses with status `PAID` can be refunded
- Refunding reverses the cash transaction
- The amount is credited back to the branch cashbox
- Expense status changes to `REFUNDED`
- Cannot refund an already refunded expense

### 5. Access Control

- Requires center access for all operations
- If `branchId` is specified, requires branch access (for staff)
- Admins can access all expenses in their accessible centers

---

## Response Format

All endpoints follow the standard `ControllerResponse` format:

```typescript
{
  success: boolean;
  data: T;  // The actual response data
  message?: string;  // Optional message
}
```

---

## Updated Finance Module Enums

### PaymentReason (Updated)

Added new reason:

```typescript
EXPENSE = 'EXPENSE';
```

### PaymentReferenceType (Updated)

Added new reference type:

```typescript
EXPENSE = 'EXPENSE';
```

When querying payments, you may see:

- `reason: "EXPENSE"` for expense payments
- `referenceType: "EXPENSE"` with `referenceId` pointing to the expense ID

---

## Example Usage

### Create an Expense

```typescript
const response = await fetch('/api/expenses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-center-id': centerId,
  },
  body: JSON.stringify({
    branchId: 'branch-uuid',
    category: 'SUPPLIES',
    title: 'Office Supplies Purchase',
    description: 'Purchased office supplies for January',
    amount: 150.5,
  }),
});

const { data } = await response.json();
// data.status will be "PAID"
// data.paymentId will contain the payment ID
```

### List Expenses with Filters

```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  status: 'PAID',
  category: 'SUPPLIES',
  dateFrom: '2024-01-01T00:00:00Z',
  dateTo: '2024-01-31T23:59:59Z',
  search: 'office',
});

const response = await fetch(`/api/expenses?${params}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'x-center-id': centerId,
  },
});
```

### Refund an Expense

```typescript
const response = await fetch(`/api/expenses/${expenseId}/refund`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'x-center-id': centerId,
  },
});

const { data } = await response.json();
// data.status will be "REFUNDED"
```

---

## Error Handling

All endpoints return standard error responses:

```typescript
{
  success: false,
  message: string,
  error?: {
    code: string,
    details?: any
  }
}
```

Common error scenarios:

- **400 Bad Request**: Validation errors, business rule violations (e.g., trying to update refunded expense)
- **403 Forbidden**: Missing permissions or no center/branch access
- **404 Not Found**: Resource not found or not accessible

---

## Integration Checklist

- [ ] Add expense permissions to role definitions
- [ ] Create expense list page with filtering
- [ ] Create expense creation form
- [ ] Create expense detail view
- [ ] Add expense update functionality (metadata only)
- [ ] Add expense refund functionality
- [ ] Update payment queries to handle `EXPENSE` reason
- [ ] Update payment queries to handle `EXPENSE` reference type
- [ ] Add expense category selector component
- [ ] Add expense status badges (PAID, REFUNDED)
- [ ] Handle access control (center/branch access)

---

## Notes for Frontend Developers

1. **Amount Format**: Amounts are returned as strings (e.g., `"150.50"`) to preserve precision. Parse as needed.

2. **Date Format**: All dates are in ISO 8601 format with timezone (e.g., `"2024-01-24T17:30:00.000Z"`).

3. **Pagination**: Follow standard pagination pattern with `page`, `limit`, and use the `links` object for navigation.

4. **Search**: The `search` parameter searches in both `title` and `description` fields.

5. **Sorting**: Use format `"field:DIRECTION"` (e.g., `"createdAt:DESC"`, `"amount:ASC"`).

6. **Context Headers**: Remember to include `x-center-id` header when required by your access control setup.
