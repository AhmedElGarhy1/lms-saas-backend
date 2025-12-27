# Paymob Payment Gateway Configuration Guide

## 🔐 Environment Variables Setup

Add these environment variables to your `.env` file:

```bash
# Paymob Payment Gateway Configuration
# IMPORTANT: PAYMOB_HMAC_SECRET is different from PAYMOB_SECRET_KEY!
# Get HMAC_SECRET from Paymob Dashboard: Settings -> Account Info (labeled as "HMAC")

PAYMOB_API_KEY=your_paymob_api_key_here
PAYMOB_PUBLIC_KEY=your_paymob_public_key_here
PAYMOB_SECRET_KEY=your_paymob_secret_key_here          # API Secret Key
PAYMOB_HMAC_SECRET=your_paymob_hmac_secret_here        # HMAC Secret (different!)

# Integration IDs for different payment methods
PAYMOB_CARD_INTEGRATION_ID=your_card_integration_id    # Credit Cards
PAYMOB_WALLET_INTEGRATION_ID=your_wallet_integration_id # Mobile Wallets
PAYMOB_PAYPAL_INTEGRATION_ID=your_paypal_integration_id # PayPal (optional)

# Iframe ID for hosted checkout
PAYMOB_IFRAME_ID=your_iframe_id                        # Required for credit cards

# Webhook Configuration
PAYMOB_NOTIFICATION_URL=https://yourdomain.com/api/v1/finance/webhooks/paymob
PAYMOB_REDIRECTION_URL=https://yourdomain.com/payment/success

# Environment
PAYMOB_TEST_MODE=true

# Base URL for webhook URL construction
BASE_URL=http://localhost:3000
```

## 🛠️ Implementation Details

**Current Implementation:** Legacy 3-Step Handshake API with Multi-Method Support
- **Step 1:** Authentication - `POST /api/auth/tokens` (API Key → Token)
- **Step 2:** Order Registration - `POST /api/ecommerce/orders` (Token → Order ID)
- **Step 3:** Payment Key Generation - `POST /api/acceptance/payment_keys` (Order ID → Payment Token)
- **Step 4:** Method-Specific Handling (Cards vs Wallets vs PayPal)

**Authentication:** API Key (from Settings → Account Info)
- Uses API key in request body for authentication
- Gets temporary token valid for 1 hour
- Token used for subsequent API calls

**Payment Gateway Methods Supported:**

| Method | Enum Value | Integration ID | Iframe ID | Step 4 Action | Final Destination |
|--------|------------|---------------|-----------|---------------|------------------|
| **Credit Card** | `CARD` | `PAYMOB_CARD_INTEGRATION_ID` | `PAYMOB_IFRAME_ID` | Construct iframe URL | Paymob hosted iframe |
| **Mobile Wallet** | `MOBILE_WALLET` | `PAYMOB_WALLET_INTEGRATION_ID` | N/A | `POST /api/acceptance/payments/pay` | Wallet OTP/redirect URL |
| **PayPal** | `PAYPAL` | `PAYMOB_PAYPAL_INTEGRATION_ID` | N/A | `POST /api/acceptance/payments/pay` | PayPal login page |

**Payment Flow:**
1. Authenticate with API key → Get auth token
2. Register order with amount/items → Get order ID (no merchant_order_id to avoid duplicates)
3. Generate payment key with complete billing data → Get payment token
4. Branch based on payment method:
   - **Cards:** Return iframe URL
   - **Wallets:** Make `/payments/pay` call → Get wallet redirect URL
   - **PayPal:** Make `/payments/pay` call → Get PayPal login URL

**Critical Fixes Applied:**
- ✅ **String amount_cents:** Send as `"2200"` (string), not `2200` (integer) - Legacy API requirement
- ✅ **Required merchant_order_id:** Use UUID to prevent duplicates and ensure order tracking
- ✅ **Complete billing data:** All required fields included (apartment, floor, etc.)
- ✅ **String quantity:** Items quantity must be `"1"` not `1`
- ✅ **Enhanced error logging:** Full Paymob response bodies logged for debugging

## ⚠️ Critical Implementation Details

**📱 Phone Number Formatting (Wallets Only):**
- Input: `+20101234567` or `0101234567`
- Output: `0101234567` (always starts with `01`, no `+20`)
- Validation: Must match `/^01\d{9}$/` (11 digits total)
- **Failure:** Paymob rejects numbers not in exact format

**🏠 Complete Billing Data Requirements:**
```json
{
  "first_name": "...",
  "last_name": "...",
  "email": "...",
  "phone_number": "...",
  "apartment": "NA",
  "floor": "NA",
  "street": "NA",
  "building": "NA",
  "shipping_method": "NA",
  "postal_code": "NA",
  "city": "Cairo",
  "country": "EG",
  "state": "NA"
}
```
**Failure:** 400 Bad Request if any required field is missing

## 💳 PayPal Integration Details

**PayPal Payment Flow:**
1. User selects "PayPal" payment method
2. System performs 3-step Paymob handshake
3. Makes additional `POST /api/acceptance/payments/pay` call with:
   ```json
   {
     "source": {
       "identifier": "paypal",
       "subtype": "PAYPAL"
     },
     "payment_token": "token_from_step_3"
   }
   ```
4. Paymob returns PayPal login URL
5. User is redirected to PayPal to complete payment
6. PayPal processes payment and redirects back
7. Webhook confirms payment completion

**Requirements:**
- ✅ Valid PayPal integration ID from Paymob dashboard
- ✅ PayPal merchant account configured with Paymob
- ✅ `PAYMOB_PAYPAL_INTEGRATION_ID` environment variable set

## 📋 Getting Paymob IDs

**Integration IDs:**
- Go to **Paymob Dashboard → Developers → Payment Integrations**
- Find your integration (Card, Wallet, PayPal)
- Copy the **Integration ID** (numeric)

**Iframe ID:**
- Go to **Paymob Dashboard → Developers → Iframes**
- Find your iframe configuration
- Copy the **Iframe ID** (numeric)
- Required for credit card hosted checkout

**Testing PayPal:**
```bash
# Test PayPal payment
curl -X POST http://localhost:3000/api/v1/finance/wallet-topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "methodType": "PAYPAL",
    "idempotencyKey": "test-paypal-123"
  }'
```

## 🔧 Troubleshooting Common Errors

### 500 Internal Server Error in Order Creation
**Symptoms:** `Request failed with status code 500` during order registration

**Possible Causes & Fixes:**

1. **Duplicate merchant_order_id:**
   - **Fix:** Code now includes `merchant_order_id` with your UUID to ensure uniqueness

2. **Invalid amount_cents format:**
   - **Fix:** Code sends `amount_cents` as string (e.g., `"2200"`), not integer (`2200`) - Legacy API requirement

3. **Empty or malformed items array:**
   - **Fix:** Code ensures items array has proper structure with string values

4. **Data type mismatches:**
   - **amount_cents:** Must be string `"2200"`
   - **quantity:** Must be string `"1"`
   - **merchant_order_id:** Required string (your UUID)

5. **Currency/account mismatch:**
   - **Fix:** Ensure your Paymob account supports EGP/USD and matches the currency sent

### Enhanced Error Logging
The system now logs full Paymob response bodies for debugging:

```typescript
this.logger.error('Paymob Order Error Detail', {
  fullResponse: error.response?.data,  // ← Full Paymob error details
  statusCode: error.response?.status,
  headers: error.response?.headers,
});
```

**Check logs for:** `Paymob Order Error Detail` to see actual Paymob error messages.

**🔐 Legacy Webhook HMAC Validation:**
- **NOT** `JSON.stringify(payload)`
- **Concatenates** specific fields in alphabetical order
- Fields: `amount_cents`, `created_at`, `currency`, `error_occured`, etc.
- Each field value converted to string and concatenated

**⚠️ Step 4 Error Handling:**
- `/payments/pay` may return 201 but with error in body
- Always check `response.data.redirection_url` exists
- Log full response for debugging wallet registration issues

## ⚠️ Critical: HMAC Secret vs API Secret

**DO NOT confuse these two secrets!**

- `PAYMOB_SECRET_KEY`: Used for API authentication and payment creation
- `PAYMOB_HMAC_SECRET`: Used exclusively for webhook signature validation

**Where to find them:**

1. Login to Paymob Dashboard
2. Go to **Settings** → **Account Info**
3. `PAYMOB_HMAC_SECRET` is labeled as "HMAC" in the dashboard

## 🔍 Testing Webhook Validation

### Valid Webhook Test:

```bash
curl -X POST "http://localhost:3000/api/v1/finance/webhooks/paymob?hmac=valid_hmac_from_paymob" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSACTION_COMPLETED",
    "obj": {
      "id": "test_transaction_123",
      "amount_cents": 10000,
      "currency": "EGP",
      "status": "completed"
    }
  }'
```

### Invalid HMAC Test:

```bash
curl -X POST "http://localhost:3000/api/v1/finance/webhooks/paymob?hmac=invalid_hmac" \
  -H "Content-Type: application/json" \
  -d '{"type": "TRANSACTION_COMPLETED", "obj": {"id": "test_123"}}'
# Should return 400 with "Webhook signature validation failed"
```

## 📊 Monitoring Queries

### Conversion Rate (Grafana):

```
sum(finance_payments_total{status="completed"}) / sum(finance_payments_total) * 100
```

### Webhook Success Rate:

```
sum(finance_webhooks_processed_total) / sum(finance_webhooks_received_total{result="valid"}) * 100
```

### Net Revenue (Income minus Refunds):

```
sum(finance_payments_total{status="completed"}) - sum(finance_refunds_processed_total{result="success"})
```

### Refund Rate:

```
sum(finance_refunds_processed_total{result="success"}) / sum(finance_payments_total{status="completed"}) * 100
```

### Webhook Processing Latency:

```
histogram_quantile(0.95, sum(rate(finance_webhook_processing_duration_seconds_bucket[5m])) by (le, provider))
```

## 🔧 Troubleshooting Common Issues

### Email Validation Errors
**Error:** `"Invalid email"` in billing_data

**Cause:** Paymob requires a valid email in billing_data, but the User entity doesn't have an email field.

**Solution:** System automatically generates placeholder emails: `user-{phone}@placeholder.local`

**Note:** This is a temporary solution. Consider adding an optional email field to the User entity for better UX.

### Environment Variables Missing
**Error:** Paymob configuration incomplete

**Check:**
```bash
# Ensure all required env vars are set
PAYMOB_API_KEY=your_key
PAYMOB_PUBLIC_KEY=your_key
PAYMOB_SECRET_KEY=your_key  # Different from API key!
PAYMOB_HMAC_SECRET=your_hmac_secret  # From dashboard Settings
PAYMOB_INTEGRATION_ID=your_integration_id
```

### Webhook Signature Validation
**Error:** HMAC validation failed

**Check:**
- Ensure `PAYMOB_HMAC_SECRET` is correct (not the API secret)
- Verify webhook URL includes `?hmac=signature` parameter

## 🛡️ Critical Refund Safety

**Automatic Protection Against Negative Balances:**

Before processing any refund through Paymob, the system checks:

```typescript
const availableBalance = wallet.balance - wallet.lockedBalance;
if (availableBalance < refundAmount) {
  throw new Error("Cannot refund: Student has insufficient available balance");
}
```

**This prevents:**
- ✅ Refunding money that has been spent on sessions
- ✅ Wallet balances going negative
- ✅ Financial inconsistencies
- ✅ Chargebacks on spent funds

**Safety Flow:**
1. Student tops up $100 → Wallet: $100
2. Student books session for $30 → Wallet: $70
3. Student requests refund for $50 → **BLOCKED** (insufficient available balance)
4. Only $70 refund allowed → Wallet: $0

## 🛡️ Security Features Implemented

1. **HMAC Validation**: Official Paymob SDK validation
2. **IP Whitelisting**: Paymob IP ranges enforced
3. **Fail-Fast Processing**: Immediate 200 OK response
4. **Async Processing**: Background wallet updates
5. **Idempotency**: Duplicate webhook prevention
6. **Circuit Breaker**: Gateway failure protection

## 🚀 Production Readiness Checklist

- [ ] Set `PAYMOB_TEST_MODE=false` for production
- [ ] Verify HMAC_SECRET is correctly set (not confused with API secret)
- [ ] Test webhook endpoint with real Paymob data
- [ ] Monitor webhook processing metrics
- [ ] Set up alerts for webhook validation failures
- [ ] Verify IP whitelisting is active
- [ ] Test fail-fast response time (< 1 second)

## 🔧 Troubleshooting

### Common Issues:

1. **"Webhook signature validation failed"**
   - Check `PAYMOB_HMAC_SECRET` is correct (not the API secret)
   - Verify HMAC is passed in query parameter `?hmac=...`

2. **"Unauthorized IP address"**
   - Paymob IP ranges may have changed
   - Update IP ranges in `webhook-security.middleware.ts`

3. **Webhook timeout/retry**
   - Ensure fail-fast pattern is working (< 1s response)
   - Check async processing is not blocking

4. **Payment not credited**
   - Check webhook async processing logs
   - Verify wallet balance updates
   - Check idempotency handling
