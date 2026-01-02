// Test file to demonstrate the automatic error mapping system

import { AuthErrors } from './src/modules/auth/exceptions/auth.errors';
import { UserErrors } from './src/modules/user/exceptions/user.errors';
import { FinanceErrors } from './src/modules/finance/exceptions/finance.errors';

// ✅ These work because the mapping automatically determines behavior
const authError1 = AuthErrors.invalidCredentials(); // No details needed
const authError2 = AuthErrors.otpRequired('login'); // Details automatically required

const userError1 = UserErrors.userNotFound(); // No details needed
const userError2 = UserErrors.emailAlreadyExists('test@example.com'); // Details required

const financeError1 = FinanceErrors.walletNotFound(); // No details needed
const financeError2 = FinanceErrors.insufficientFunds(100, 200, 'EGP'); // Details required

// ❌ These would cause compile errors if uncommented:
// AuthErrors.invalidCredentials({}); // Error: no details allowed
// AuthErrors.otpRequired(); // Error: details required
// UserErrors.userNotFound('extra param'); // Error: no parameters allowed

console.log('✅ All automatic mappings work correctly!');
