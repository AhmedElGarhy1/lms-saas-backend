# Frontend Timezone Implementation Guide

## Overview

This guide outlines critical considerations for the frontend team when working with date and timezone handling in the LMS backend API.

---

## 1. Date Format Requirements

### Date-Only Fields (YYYY-MM-DD Format)

For fields that represent calendar days (not specific times), **always send date strings in YYYY-MM-DD format**:

- Class `startDate` / `endDate`
- Calendar session queries (`dateFrom` / `dateTo`)
- Date filters in pagination (`dateFrom` / `dateTo`)

**Example:**
```typescript
// ✅ CORRECT
{
  startDate: "2024-01-01",  // String in YYYY-MM-DD format
  endDate: "2024-12-31"
}

// ❌ WRONG
{
  startDate: "2024-01-01T00:00:00Z",  // Don't send ISO strings
  startDate: new Date("2024-01-01"),  // Don't send Date objects
}
```

### Event Fields (ISO 8601 Format)

For fields with specific times (sessions, timestamps), send ISO 8601 strings:

- Session `startTime` / `endTime`
- Any datetime fields

**Example:**
```typescript
// ✅ CORRECT
{
  startTime: "2024-01-01T10:00:00Z",  // ISO 8601 string
  endTime: "2024-01-01T11:30:00Z"
}
```

---

## 2. ⚠️ Error Handling: 400 Bad Request

### The Problem

If the frontend accidentally sends an ISO string where a YYYY-MM-DD is expected (e.g., in `startDate`), the backend regex `@Matches(/^\d{4}-\d{2}-\d{2}$/)` will trigger a **400 Bad Request** error.

**Example of what causes the error:**
```typescript
// ❌ This will cause 400 Bad Request
{
  startDate: "2024-01-01T00:00:00Z"  // ISO string instead of YYYY-MM-DD
}
```

### Frontend Action Required

**Ensure your form validation (Zod/Yup) matches the backend regex** so the user gets a clean error message before the API call fails.

**Zod Example:**
```typescript
import { z } from 'zod';

const createClassSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format (e.g., 2024-01-01)'
  }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format (e.g., 2024-12-31)'
  }).optional(),
});
```

**Yup Example:**
```typescript
import * as yup from 'yup';

const createClassSchema = yup.object({
  startDate: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format (e.g., 2024-01-01)')
    .required(),
  endDate: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format (e.g., 2024-12-31)')
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

// Display a UTC date in center timezone
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
- Backend receives correct date strings

---

## 5. API Request Patterns

### Creating/Updating Classes

```typescript
// Create class with date-only fields
POST /classes
{
  startDate: "2024-01-01",  // YYYY-MM-DD string
  endDate: "2024-12-31",    // YYYY-MM-DD string
  // ... other fields
}
```

### Calendar Session Queries

```typescript
// Get calendar sessions
GET /sessions/calendar?dateFrom=2024-01-01&dateTo=2024-01-31
// Backend interprets these as full calendar days in center timezone
```

### Pagination with Date Filters

```typescript
// Filter notifications, activity logs, etc.
GET /notifications?dateFrom=2024-01-01&dateTo=2024-01-31
// Backend automatically converts to UTC range based on center timezone
```

---

## 6. Date Conversion Utilities

Create helper functions:

```typescript
import { formatInTimeZone } from '@date-fns/tz';

// Convert user-selected date to YYYY-MM-DD string
function formatDateForAPI(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

// Convert UTC date from API to display in center timezone
function formatDateForDisplay(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd HH:mm');
}

// Get start/end of day in center timezone for date pickers
function getDayRange(date: Date, timezone: string) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return {
    start: formatInTimeZone(start, timezone, 'yyyy-MM-dd'),
    end: formatInTimeZone(end, timezone, 'yyyy-MM-dd')
  };
}
```

---

## 7. Important Behaviors

### Date-Only Fields Are Interpreted as Midnight in Center Timezone

- When you send `startDate: "2024-01-01"`, backend treats it as Jan 1st 00:00:00 in center timezone
- This prevents "one day off" bugs across timezones

### Date Ranges Are Inclusive

- `dateFrom: "2024-01-01"` includes all of Jan 1st
- `dateTo: "2024-01-31"` includes all of Jan 31st
- Backend uses exclusive upper bounds internally (`<` not `<=`)

### Backend Handles Timezone Conversion

- Frontend sends date strings (YYYY-MM-DD) or ISO timestamps
- Backend converts to UTC using center timezone
- **No need to convert to UTC on frontend**

---

## 8. Validation

### Date Format Validation

- Validate YYYY-MM-DD format before sending
- Use regex: `/^\d{4}-\d{2}-\d{2}$/`
- Backend will reject invalid formats

### Date Range Validation

- Calendar queries: max 45 days between `dateFrom` and `dateTo`
- `dateTo` must be after `dateFrom`
- Validate on frontend before sending

---

## 9. Migration Checklist

- [ ] Install `@date-fns/tz` in frontend
- [ ] Update date pickers to output YYYY-MM-DD for date-only fields
- [ ] **Add form validation (Zod/Yup) matching backend regex `/^\d{4}-\d{2}-\d{2}$/`**
- [ ] Configure FullCalendar with center timezone
- [ ] Update API calls to send YYYY-MM-DD strings (not ISO dates)
- [ ] Add date formatting utilities for display
- [ ] Update date filter components to use YYYY-MM-DD format
- [ ] Test with different timezones (Cairo, UTC, etc.)
- [ ] Verify calendar displays correctly in center timezone

---

## 10. Common Pitfalls to Avoid

1. ❌ **Don't convert date-only fields to UTC on frontend** — send YYYY-MM-DD strings
2. ❌ **Don't send Date objects** — always send strings
3. ❌ **Don't assume server timezone** — always use center timezone from API
4. ❌ **Don't use `new Date()` for date-only fields** — use date pickers that output YYYY-MM-DD
5. ❌ **Don't forget to format display dates** — use `formatInTimeZone` for user-facing dates
6. ❌ **Don't skip form validation** — validate date format before API calls to prevent 400 errors

---

## 11. Testing Scenarios

Test these scenarios:
- Create class with `startDate: "2024-01-01"` in Cairo timezone
- Query calendar sessions for a specific date range
- Filter notifications by date range
- Display session times in center timezone
- Handle DST transitions (if applicable)
- **Test form validation catches ISO strings before API call**

---

## Summary

**Key Takeaway:** Send date-only fields as **YYYY-MM-DD strings**, display dates using the **center timezone**, and let the backend handle UTC conversion. The backend interprets all date-only strings as midnight in the center's timezone, preventing timezone-related bugs.

**Critical:** Always validate date format on the frontend using the same regex as the backend (`/^\d{4}-\d{2}-\d{2}$/`) to prevent 400 Bad Request errors and provide better user experience.

