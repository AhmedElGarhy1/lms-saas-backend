import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPECTED_LISTENER_EVENTS } from '../src/modules/notifications/config/expected-listeners.registry';
import { AuthEvents } from '../src/shared/events/auth.events.enum';
import { CenterEvents } from '../src/shared/events/center.events.enum';

/**
 * Validates that all expected events have @OnEvent listeners in NotificationListener
 * This script ensures type safety by catching missing listeners at build time
 */

// Read NotificationListener file
const listenerFilePath = join(
  process.cwd(),
  'src/modules/notifications/listeners/notification.listener.ts',
);

let listenerFile: string;
try {
  listenerFile = readFileSync(listenerFilePath, 'utf-8');
} catch (error) {
  console.error(
    `Failed to read NotificationListener file: ${listenerFilePath}`,
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Extract @OnEvent handlers using regex
// Pattern matches: @OnEvent(EventName.EVENT_NAME)
// Examples: @OnEvent(AuthEvents.OTP_SENT) or @OnEvent(CenterEvents.CREATED)
const onEventPattern = /@OnEvent\((\w+Events\.\w+)\)/g;
const foundEnumRefs: string[] = [];
let match;

while ((match = onEventPattern.exec(listenerFile)) !== null) {
  foundEnumRefs.push(match[1]);
}

// Map enum references to actual event string values
const enumToEventMap: Record<string, string> = {
  // AuthEvents
  'AuthEvents.OTP_SENT': AuthEvents.OTP_SENT,
  'AuthEvents.PASSWORD_RESET_REQUESTED': AuthEvents.PASSWORD_RESET_REQUESTED,
  'AuthEvents.EMAIL_VERIFICATION_REQUESTED':
    AuthEvents.EMAIL_VERIFICATION_REQUESTED,
  // CenterEvents
  'CenterEvents.CREATED': CenterEvents.CREATED,
  'CenterEvents.UPDATED': CenterEvents.UPDATED,
};

// Convert enum references to event string values
const foundEventStrings = foundEnumRefs
  .map((enumRef) => enumToEventMap[enumRef])
  .filter((event): event is string => !!event);

// Also extract actual event string values from the code (if any are used directly)
const eventStringPattern = /@OnEvent\(['"]([\w.]+)['"]\)/g;
let stringMatch;

while ((stringMatch = eventStringPattern.exec(listenerFile)) !== null) {
  foundEventStrings.push(stringMatch[1]);
}

// Combine and deduplicate
const allFoundEvents = [...new Set(foundEventStrings)];

// Check all expected listeners exist
// Expected events are EventType values (strings like 'auth.otp.sent')
// Found events are converted from enum references to string values
const missingListeners = EXPECTED_LISTENER_EVENTS.filter(
  (event) => !allFoundEvents.includes(event),
);

if (missingListeners.length > 0) {
  console.error('❌ Missing event listeners:');
  missingListeners.forEach((event) => {
    console.error(`   - ${event}`);
  });
  console.error(
    `\nExpected ${EXPECTED_LISTENER_EVENTS.length} listeners, found ${allFoundEvents.length}`,
  );
  process.exit(1);
}

console.log('✅ All expected listeners found');
console.log(`   Found ${allFoundEvents.length} listener(s)`);
allFoundEvents.forEach((listener) => {
  console.log(`   - ${listener}`);
});

