# Frontend Timezone Implementation Guide

## Overview

This guide outlines critical considerations for the frontend team when working with date and timezone handling in the LMS backend API. **All date fields now require ISO 8601 format with timezone offset.**

---

## 1. Date Format Requirements

### All Date Fields (ISO 8601 Format with Timezone)

**All date fields must be sent as ISO 8601 strings with timezone offset:**

- Class `startDate` / `endDate`
- Session `startTime` / `endTime`
- Calendar session queries (`dateFrom` / `dateTo`)
- Date filters in pagination (`dateFrom` / `dateTo`)
- User `dateOfBirth`
- Any other datetime fields

**CRITICAL: Timezone offset is REQUIRED**

**Example:**
```typescript
// ✅ CORRECT - ISO 8601 with timezone
{
  startDate: "2024-01-01T00:00:00+02:00",  // ISO 8601 with timezone
  startTime: "2024-01-15T14:30:00+02:00",  // ISO 8601 with timezone
  dateFrom: "2024-01-01T00:00:00+02:00",   // ISO 8601 with timezone
  dateTo: "2024-01-31T23:59:59+02:00"      // ISO 8601 with timezone
}

// ✅ ALSO CORRECT - UTC timezone
{
  startDate: "2024-01-01T00:00:00Z",        // ISO 8601 with Z (UTC)
  startTime: "2024-01-15T14:30:00Z"        // ISO 8601 with Z (UTC)
}

// ❌ WRONG - Missing timezone
{
  startDate: "2024-01-01T00:00:00",        // Missing timezone - will be rejected
  startTime: "2024-01-15T14:30:00"         // Missing timezone - will be rejected
}

// ❌ WRONG - YYYY-MM-DD format (old format, no longer supported)
{
  startDate: "2024-01-01",                 // Old format - will be rejected
  dateFrom: "2024-01-01"                   // Old format - will be rejected
}

// ❌ WRONG - Date objects
{
  startDate: new Date("2024-01-01"),       // Don't send Date objects
  startTime: new Date()                     // Don't send Date objects
}
```

### Supported ISO 8601 Formats

- `2024-01-15T14:30:00Z` - UTC timezone (Z)
- `2024-01-15T14:30:00+02:00` - Timezone with offset (+02:00)
- `2024-01-15T14:30:00-05:00` - Timezone with negative offset (-05:00)
- `2024-01-15T14:30:00.000Z` - With milliseconds (optional)
- `2024-01-15T14:30:00.123+02:00` - With milliseconds and offset

---

## 2. ⚠️ Error Handling: 400 Bad Request

### The Problem

If the frontend sends an ISO string **without timezone offset**, the backend will reject it with a **400 Bad Request** error.

**Example of what causes the error:**
```typescript
// ❌ This will cause 400 Bad Request
{
  startDate: "2024-01-01T00:00:00"  // Missing timezone offset
}
```

### Frontend Action Required

**Ensure your form validation (Zod/Yup) validates ISO 8601 format with required timezone** so the user gets a clean error message before the API call fails.

**Zod Example:**
```typescript
import { z } from 'zod';

// ISO 8601 regex with required timezone (Z or +/-HH:MM)
const iso8601WithTimezoneRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

const createClassSchema = z.object({
  startDate: z.string().regex(iso8601WithTimezoneRegex, {
    message: 'startDate must be in ISO 8601 format with timezone (e.g., 2024-01-01T00:00:00+02:00)'
  }),
  endDate: z.string().regex(iso8601WithTimezoneRegex, {
    message: 'endDate must be in ISO 8601 format with timezone (e.g., 2024-12-31T23:59:59+02:00)'
  }).optional(),
});

const createSessionSchema = z.object({
  startTime: z.string().regex(iso8601WithTimezoneRegex, {
    message: 'startTime must be in ISO 8601 format with timezone (e.g., 2024-01-15T14:30:00+02:00)'
  }),
  duration: z.number().min(1),
});
```

**Yup Example:**
```typescript
import * as yup from 'yup';

const iso8601WithTimezoneRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

const createClassSchema = yup.object({
  startDate: yup
    .string()
    .matches(iso8601WithTimezoneRegex, 'startDate must be in ISO 8601 format with timezone (e.g., 2024-01-01T00:00:00+02:00)')
    .required(),
  endDate: yup
    .string()
    .matches(iso8601WithTimezoneRegex, 'endDate must be in ISO 8601 format with timezone (e.g., 2024-12-31T23:59:59+02:00)')
    .optional(),
});
```

**Benefits:**
- Users see validation errors immediately in the form
- Prevents unnecessary API calls
- Better user experience with clear error messages
- Matches backend validation exactly

---

## 3. Timezone Display

### Get Center Timezone

- The center's timezone is available in the Center response (`center.timezone`)
- Default: `'Africa/Cairo'` if not specified
- Store it in your app state/context

### Display Dates in Center Timezone

Use `@date-fns/tz` (or similar) to format dates for display:

```typescript
import { formatInTimeZone } from '@date-fns/tz';

// Display a UTC date from API in center timezone
const displayDate = formatInTimeZone(
  utcDateFromAPI,        // Date from backend (UTC)
  centerTimezone,        // e.g., 'Africa/Cairo'
  'yyyy-MM-dd HH:mm'     // Format string
);
```

---

## 4. Calendar Integration

### FullCalendar Configuration

Configure FullCalendar to use the center's timezone:

```typescript
import { Calendar } from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';

<Calendar
  plugins={[timeGridPlugin]}
  timeZone={centerTimezone}  // Use center's timezone
  // ... other props
/>
```

This ensures:
- Calendar displays in center timezone
- User interactions are in center timezone
- Backend receives correct ISO 8601 strings with timezone

---

## 5. API Request Patterns

### Creating/Updating Classes

```typescript
// Create class with ISO 8601 dates
POST /classes
{
  startDate: "2024-01-01T00:00:00+02:00",  // ISO 8601 with timezone
  endDate: "2024-12-31T23:59:59+02:00",     // ISO 8601 with timezone
  // ... other fields
}
```

### Creating Sessions

```typescript
// Create session with ISO 8601 startTime
POST /sessions
{
  groupId: "uuid",
  startTime: "2024-01-15T14:30:00+02:00",  // ISO 8601 with timezone
  duration: 120,
  // ... other fields
}
```

### Calendar Session Queries

```typescript
// Get calendar sessions
GET /sessions/calendar?dateFrom=2024-01-01T00:00:00%2B02:00&dateTo=2024-01-31T23:59:59%2B02:00
// URL encode the + sign as %2B
// Backend interprets these as full calendar days in center timezone
```

### Pagination with Date Filters

```typescript
// Filter notifications, activity logs, etc.
GET /notifications?dateFrom=2024-01-01T00:00:00%2B02:00&dateTo=2024-01-31T23:59:59%2B02:00
// Backend automatically converts to UTC range based on center timezone
```

---

## 6. Date Conversion Utilities

Create helper functions:

```typescript
import { formatInTimeZone } from '@date-fns/tz';

/**
 * Convert user-selected date to ISO 8601 string with timezone
 * @param date - Date object from date picker
 * @param timezone - Center timezone (e.g., 'Africa/Cairo')
 * @returns ISO 8601 string with timezone offset
 */
function formatDateForAPI(date: Date, timezone: string): string {
  // Format as ISO 8601 with timezone offset
  // Example: "2024-01-15T14:30:00+02:00"
  const year = formatInTimeZone(date, timezone, 'yyyy');
  const month = formatInTimeZone(date, timezone, 'MM');
  const day = formatInTimeZone(date, timezone, 'dd');
  const hours = formatInTimeZone(date, timezone, 'HH');
  const minutes = formatInTimeZone(date, timezone, 'mm');
  const seconds = formatInTimeZone(date, timezone, 'ss');
  
  // Get timezone offset
  const offset = getTimezoneOffset(date, timezone);
  const offsetStr = formatTimezoneOffset(offset);
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

/**
 * Convert UTC date from API to display in center timezone
 */
function formatDateForDisplay(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd HH:mm');
}

/**
 * Get start/end of day in center timezone for date pickers
 */
function getDayRange(date: Date, timezone: string) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return {
    start: formatDateForAPI(start, timezone),
    end: formatDateForAPI(end, timezone)
  };
}

// Helper to get timezone offset string
function formatTimezoneOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Z';
  const sign = offsetMinutes > 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
```

**Alternative: Use a library like `date-fns-tz` or `luxon`**

```typescript
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Using date-fns-tz
function formatDateForAPI(date: Date, timezone: string): string {
  // Convert to zoned time and format as ISO
  const zoned = toZonedTime(date, timezone);
  // Format with timezone offset
  return formatInTimeZone(zoned, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
```

---

## 7. Important Behaviors

### All Dates Are Converted to UTC Automatically

- Frontend sends ISO 8601 strings with timezone
- Backend automatically converts to UTC Date objects
- **No need to convert to UTC on frontend** - just include the timezone in the ISO string

### Date Ranges Are Inclusive

- `dateFrom: "2024-01-01T00:00:00+02:00"` includes all of Jan 1st in center timezone
- `dateTo: "2024-01-31T23:59:59+02:00"` includes all of Jan 31st in center timezone
- Backend uses exclusive upper bounds internally (`<` not `<=`)

### Backend Handles Timezone Conversion

- Frontend sends ISO 8601 strings with timezone
- Backend converts to UTC using the timezone in the ISO string
- **Always include timezone in ISO strings** - this is required

---

## 8. Validation

### Date Format Validation

- Validate ISO 8601 format with timezone before sending
- Use regex: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/`
- Backend will reject invalid formats or missing timezone

### Date Range Validation

- Calendar queries: max 45 days between `dateFrom` and `dateTo`
- `dateTo` must be after `dateFrom`
- Validate on frontend before sending

---

## 9. Migration Checklist

- [ ] Install `@date-fns/tz` or similar timezone library in frontend
- [ ] Update date pickers to output ISO 8601 format with timezone
- [ ] **Add form validation (Zod/Yup) matching backend ISO 8601 regex with timezone**
- [ ] Configure FullCalendar with center timezone
- [ ] Update API calls to send ISO 8601 strings with timezone (not YYYY-MM-DD)
- [ ] Add date formatting utilities for API requests
- [ ] Update date filter components to use ISO 8601 format
- [ ] Test with different timezones (Cairo, UTC, etc.)
- [ ] Verify calendar displays correctly in center timezone
- [ ] Test that validation rejects ISO strings without timezone

---

## 10. Common Pitfalls to Avoid

1. ❌ **Don't send ISO strings without timezone** — always include Z or +/-HH:MM
2. ❌ **Don't send Date objects** — always send ISO 8601 strings
3. ❌ **Don't assume server timezone** — always use center timezone from API
4. ❌ **Don't use YYYY-MM-DD format** — old format is no longer supported
5. ❌ **Don't forget to format display dates** — use `formatInTimeZone` for user-facing dates
6. ❌ **Don't skip form validation** — validate ISO 8601 format with timezone before API calls
7. ❌ **Don't convert to UTC on frontend** — send ISO string with timezone, backend handles conversion

---

## 11. Testing Scenarios

Test these scenarios:
- Create class with `startDate: "2024-01-01T00:00:00+02:00"` in Cairo timezone
- Create session with `startTime: "2024-01-15T14:30:00+02:00"` in Cairo timezone
- Query calendar sessions for a specific date range with ISO 8601 dates
- Filter notifications by date range with ISO 8601 dates
- Display session times in center timezone
- Handle DST transitions (if applicable)
- **Test form validation catches ISO strings without timezone before API call**
- Test with UTC timezone (`Z` suffix)
- Test with positive and negative timezone offsets

---

## 12. Example: Complete Session Creation Flow

```typescript
import { formatInTimeZone } from '@date-fns/tz';

// 1. User selects date and time in date picker (in center timezone)
const selectedDate = new Date('2024-01-15T14:30:00'); // User's local selection

// 2. Get center timezone from API
const centerTimezone = 'Africa/Cairo'; // From center response

// 3. Format as ISO 8601 with timezone for API
const startTimeISO = formatDateForAPI(selectedDate, centerTimezone);
// Result: "2024-01-15T14:30:00+02:00"

// 4. Send to API
const response = await fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    groupId: 'uuid',
    startTime: startTimeISO, // ISO 8601 with timezone
    duration: 120
  })
});

// 5. Display response dates in center timezone
const session = await response.json();
const displayTime = formatInTimeZone(
  new Date(session.startTime), // UTC from API
  centerTimezone,
  'yyyy-MM-dd HH:mm'
);
// Result: "2024-01-15 14:30" (in center timezone)
```

---

## Summary

**Key Takeaway:** Send **all date fields as ISO 8601 strings with timezone offset** (Z or +/-HH:MM), display dates using the **center timezone**, and let the backend handle UTC conversion. The backend automatically converts all ISO 8601 strings to UTC Date objects.

**Critical:** 
- Always include timezone in ISO 8601 strings (required)
- Always validate ISO 8601 format with timezone on the frontend before API calls
- Never send YYYY-MM-DD format (old format, no longer supported)
- Never send Date objects (always send strings)
