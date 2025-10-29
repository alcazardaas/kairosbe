# Kairos Dashboard API Specification

**Version:** 1.0
**Base URL:** `/api/v1`
**Authentication:** Session-based (session token required in headers)

---

## Overview

This document provides comprehensive API specifications for the Kairos dashboard endpoints. These endpoints provide weekly statistics, project aggregations, and holiday information optimized for dashboard displays.

**Implementation Status:**
- ✅ Story 1: Enhanced Weekly Stats - **IMPLEMENTED**
- ✅ Story 2: User Project Statistics - **IMPLEMENTED**
- ✅ Story 3: Holidays API Enhancement - **IMPLEMENTED**
- ⏳ Story 4: Dashboard Summary Aggregation - **NOT IMPLEMENTED** (Optional, can be added later)

---

## Table of Contents

1. [Story 1: Enhanced Weekly Stats](#story-1-enhanced-weekly-stats)
2. [Story 2: User Project Statistics](#story-2-user-project-statistics)
3. [Story 3: Company Holidays Calendar](#story-3-company-holidays-calendar)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [Error Handling](#error-handling)
6. [Date Format Specifications](#date-format-specifications)
7. [Testing Examples](#testing-examples)
8. [Integration Guide](#integration-guide)

---

## Story 1: Enhanced Weekly Stats

### Endpoint
```
GET /api/v1/time-entries/stats/weekly/{userId}/{weekStartDate}
```

### Description
Get weekly hours for a user with daily breakdown, including total hours, hours per day, week end date, and entry count.

### Parameters

| Parameter | Type | Location | Required | Description | Example |
|-----------|------|----------|----------|-------------|---------|
| userId | UUID | Path | Yes | User ID | `123e4567-e89b-12d3-a456-426614174001` |
| weekStartDate | Date | Path | Yes | Week start date (YYYY-MM-DD) | `2025-01-27` |

### Response (200 OK)

```json
{
  "userId": "user123",
  "weekStartDate": "2025-01-27",
  "weekEndDate": "2025-02-02",
  "totalHours": 42.5,
  "hoursPerDay": {
    "2025-01-27": 8.5,
    "2025-01-28": 7.0,
    "2025-01-29": 8.0,
    "2025-01-30": 8.0,
    "2025-01-31": 7.5,
    "2025-02-01": 3.5,
    "2025-02-02": 0
  },
  "entriesCount": 15
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| userId | string | User ID |
| weekStartDate | string | Week start date in YYYY-MM-DD format |
| weekEndDate | string | Week end date (weekStartDate + 6 days) in YYYY-MM-DD format |
| totalHours | number | Total hours logged during the week (rounded to 2 decimals) |
| hoursPerDay | object | Object with date keys (YYYY-MM-DD) and hours as values. All 7 days included, even if 0 hours |
| entriesCount | number | Total number of time entries in the week |

### Edge Cases

**User with no time entries:**
```json
{
  "userId": "user123",
  "weekStartDate": "2025-01-27",
  "weekEndDate": "2025-02-02",
  "totalHours": 0,
  "hoursPerDay": {
    "2025-01-27": 0,
    "2025-01-28": 0,
    "2025-01-29": 0,
    "2025-01-30": 0,
    "2025-01-31": 0,
    "2025-02-01": 0,
    "2025-02-02": 0
  },
  "entriesCount": 0
}
```

### cURL Example

```bash
curl -X GET "http://localhost:3000/api/v1/time-entries/stats/weekly/user123/2025-01-27" \
  -H "Cookie: session_token=your-session-token"
```

### Axios Example (Frontend)

```typescript
import axios from 'axios';

const getWeeklyStats = async (userId: string, weekStartDate: string) => {
  const response = await axios.get(
    `/api/v1/time-entries/stats/weekly/${userId}/${weekStartDate}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
```

---

## Story 2: User Project Statistics

### Endpoint
```
GET /api/v1/time-entries/stats/user-projects/{userId}
```

### Description
Get aggregated project statistics for a user, showing hours distribution across all projects with optional date filtering.

### Parameters

| Parameter | Type | Location | Required | Description | Example |
|-----------|------|----------|----------|-------------|---------|
| userId | UUID | Path | Yes | User ID | `user123` |
| weekStartDate | Date | Query | No | Filter for specific week (YYYY-MM-DD) | `2025-01-27` |
| startDate | Date | Query | No | Filter from date (YYYY-MM-DD) | `2025-01-01` |
| endDate | Date | Query | No | Filter to date (YYYY-MM-DD) | `2025-01-31` |

### Query Parameter Logic

1. If `weekStartDate` is provided, it filters for that specific week only
2. If `startDate` and/or `endDate` are provided (without `weekStartDate`), it uses date range filtering
3. If no date parameters are provided, **defaults to current week**
4. `weekStartDate` takes precedence over `startDate`/`endDate`

### Response (200 OK)

```json
{
  "userId": "user123",
  "totalHours": 42.5,
  "projects": [
    {
      "projectId": "proj-001",
      "projectName": "Kairos Frontend",
      "totalHours": 25.5,
      "percentage": 60.0
    },
    {
      "projectId": "proj-002",
      "projectName": "API Development",
      "totalHours": 12.0,
      "percentage": 28.24
    },
    {
      "projectId": "proj-003",
      "projectName": "Documentation",
      "totalHours": 5.0,
      "percentage": 11.76
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| userId | string | User ID |
| totalHours | number | Total hours across all projects (rounded to 2 decimals) |
| projects | array | Array of project statistics, sorted by totalHours descending |
| projects[].projectId | string | Project UUID |
| projects[].projectName | string | Project name |
| projects[].totalHours | number | Total hours logged to this project (rounded to 2 decimals) |
| projects[].percentage | number | Percentage of total hours (rounded to 2 decimals, sum = 100%) |

### Edge Cases

**User with no time entries:**
```json
{
  "userId": "user123",
  "totalHours": 0,
  "projects": []
}
```

**Single project (100%):**
```json
{
  "userId": "user123",
  "totalHours": 40.0,
  "projects": [
    {
      "projectId": "proj-001",
      "projectName": "Main Project",
      "totalHours": 40.0,
      "percentage": 100.0
    }
  ]
}
```

### cURL Examples

**Current week (default):**
```bash
curl -X GET "http://localhost:3000/api/v1/time-entries/stats/user-projects/user123" \
  -H "Cookie: session_token=your-session-token"
```

**Specific week:**
```bash
curl -X GET "http://localhost:3000/api/v1/time-entries/stats/user-projects/user123?weekStartDate=2025-01-27" \
  -H "Cookie: session_token=your-session-token"
```

**Date range:**
```bash
curl -X GET "http://localhost:3000/api/v1/time-entries/stats/user-projects/user123?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Cookie: session_token=your-session-token"
```

### Axios Example (Frontend)

```typescript
import axios from 'axios';

interface ProjectStatsParams {
  weekStartDate?: string;
  startDate?: string;
  endDate?: string;
}

const getUserProjectStats = async (userId: string, params?: ProjectStatsParams) => {
  const response = await axios.get(
    `/api/v1/time-entries/stats/user-projects/${userId}`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
};

// Usage examples:
// Current week: await getUserProjectStats('user123')
// Specific week: await getUserProjectStats('user123', { weekStartDate: '2025-01-27' })
// Date range: await getUserProjectStats('user123', { startDate: '2025-01-01', endDate: '2025-01-31' })
```

---

## Story 3: Company Holidays Calendar

### Endpoint
```
GET /api/v1/holidays
```

### Description
Get holidays calendar with filtering options. Supports pagination, date ranges, type filtering, and upcoming holidays.

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number (default: 1) | `1` |
| limit | number | No | Items per page (default: 20, max: 100) | `50` |
| sort | string | No | Sort field and order (format: `field:asc\|desc`) | `date:asc` |
| tenant_id | UUID | No | Filter by tenant ID (null for global holidays) | `tenant123` |
| country_code | string | No | Filter by 2-letter country code | `US` |
| type | string | No | Filter by type: `public`, `company`, or `regional` | `public` |
| startDate | Date | No | Show holidays from this date forward (YYYY-MM-DD) | `2025-01-01` |
| endDate | Date | No | Show holidays up to this date (YYYY-MM-DD) | `2025-12-31` |
| upcoming | boolean | No | If true, show only future holidays | `true` |
| year | number | No | Filter by year (1900-2100) | `2025` |
| search | string | No | Search holidays by name (case-insensitive) | `christmas` |

### Default Behavior

**If no date filters are provided**, the API returns holidays for the **next 12 months** from today.

### Response (200 OK)

```json
{
  "data": [
    {
      "id": "hol-001",
      "tenant_id": null,
      "country_code": "US",
      "name": "New Year's Day",
      "date": "2025-01-01",
      "type": "public",
      "is_recurring": true,
      "description": "Public holiday celebrated nationwide"
    },
    {
      "id": "hol-002",
      "tenant_id": "tenant123",
      "country_code": "US",
      "name": "Company Foundation Day",
      "date": "2025-03-15",
      "type": "company",
      "is_recurring": true,
      "description": "Annual company celebration"
    },
    {
      "id": "hol-003",
      "tenant_id": null,
      "country_code": "US",
      "name": "Independence Day",
      "date": "2025-07-04",
      "type": "public",
      "is_recurring": true,
      "description": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of holiday objects |
| data[].id | UUID | Holiday ID |
| data[].tenant_id | UUID \| null | Tenant ID (null = global holiday) |
| data[].country_code | string | 2-letter country code |
| data[].name | string | Holiday name |
| data[].date | string | Holiday date (YYYY-MM-DD format) |
| data[].type | string | Holiday type: `public`, `company`, or `regional` |
| data[].is_recurring | boolean | True if holiday repeats annually |
| data[].description | string \| null | Optional description |
| meta | object | Pagination metadata |
| meta.page | number | Current page number |
| meta.limit | number | Items per page |
| meta.total | number | Total number of holidays matching filters |

### cURL Examples

**Next 12 months (default):**
```bash
curl -X GET "http://localhost:3000/api/v1/holidays" \
  -H "Cookie: session_token=your-session-token"
```

**Upcoming holidays only:**
```bash
curl -X GET "http://localhost:3000/api/v1/holidays?upcoming=true&limit=5" \
  -H "Cookie: session_token=your-session-token"
```

**Public holidays for 2025:**
```bash
curl -X GET "http://localhost:3000/api/v1/holidays?type=public&year=2025" \
  -H "Cookie: session_token=your-session-token"
```

**Date range:**
```bash
curl -X GET "http://localhost:3000/api/v1/holidays?startDate=2025-01-01&endDate=2025-06-30" \
  -H "Cookie: session_token=your-session-token"
```

**Company holidays only:**
```bash
curl -X GET "http://localhost:3000/api/v1/holidays?type=company" \
  -H "Cookie: session_token=your-session-token"
```

### Axios Example (Frontend)

```typescript
import axios from 'axios';

interface HolidaysParams {
  page?: number;
  limit?: number;
  type?: 'public' | 'company' | 'regional';
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
  year?: number;
}

const getHolidays = async (params?: HolidaysParams) => {
  const response = await axios.get('/api/v1/holidays', {
    params,
    withCredentials: true,
  });
  return response.data;
};

// Usage examples:
// Next 12 months: await getHolidays()
// Next 5 upcoming: await getHolidays({ upcoming: true, limit: 5 })
// Public holidays 2025: await getHolidays({ type: 'public', year: 2025 })
```

---

## TypeScript Interfaces

### Story 1: Weekly Stats

```typescript
interface WeeklyStats {
  userId: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  totalHours: number;
  hoursPerDay: Record<string, number>; // { "2025-01-27": 8.5, ... }
  entriesCount: number;
}
```

### Story 2: User Project Stats

```typescript
interface ProjectStats {
  projectId: string;
  projectName: string;
  totalHours: number;
  percentage: number; // Rounded to 2 decimals
}

interface UserProjectStats {
  userId: string;
  totalHours: number;
  projects: ProjectStats[]; // Sorted by totalHours descending
}
```

### Story 3: Holidays

```typescript
type HolidayType = 'public' | 'company' | 'regional';

interface Holiday {
  id: string;
  tenant_id: string | null;
  country_code: string; // 2-letter ISO code
  name: string;
  date: string; // YYYY-MM-DD
  type: HolidayType;
  is_recurring: boolean;
  description?: string | null;
}

interface HolidaysResponse {
  data: Holiday[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## Error Handling

All endpoints follow standard HTTP error responses:

### 400 Bad Request
Invalid query parameters or request body

```json
{
  "error": "Bad Request",
  "message": "Invalid date format",
  "statusCode": 400
}
```

### 401 Unauthorized
Missing or invalid session token

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session token",
  "statusCode": 401
}
```

### 404 Not Found
Resource not found

```json
{
  "error": "Not Found",
  "message": "User not found",
  "statusCode": 404
}
```

### 500 Internal Server Error
Server error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## Date Format Specifications

### Input Formats

All date inputs must be in **ISO 8601 format** (YYYY-MM-DD):
- ✅ `2025-01-27`
- ✅ `2025-12-31`
- ❌ `01/27/2025`
- ❌ `27-01-2025`

### Output Formats

All date outputs are in **YYYY-MM-DD format**:
- Week start/end dates: `"2025-01-27"`
- Holiday dates: `"2025-01-01"`
- Object keys in `hoursPerDay`: `"2025-01-27"`

### Week Start Policy

The system respects the tenant's `timesheet_policies.week_start_policy`:
- `0` = Sunday
- `1` = Monday (default)
- `2` = Tuesday
- etc.

When providing `weekStartDate`, ensure it aligns with your tenant's policy.

---

## Testing Examples

### Frontend Integration Test (React + Axios)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';

describe('Dashboard API Integration', () => {
  const userId = 'test-user-123';
  const weekStart = '2025-01-27';

  test('fetches weekly stats with daily breakdown', async () => {
    const { result } = renderHook(() =>
      useQuery(['weeklyStats', userId, weekStart], () =>
        axios.get(`/api/v1/time-entries/stats/weekly/${userId}/${weekStart}`)
          .then(res => res.data)
      )
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      userId,
      weekStartDate: weekStart,
      weekEndDate: '2025-02-02',
      totalHours: expect.any(Number),
      hoursPerDay: expect.any(Object),
      entriesCount: expect.any(Number),
    });

    // Verify all 7 days are present
    const days = Object.keys(result.current.data.hoursPerDay);
    expect(days).toHaveLength(7);
  });

  test('fetches user project stats with percentages', async () => {
    const { result } = renderHook(() =>
      useQuery(['projectStats', userId], () =>
        axios.get(`/api/v1/time-entries/stats/user-projects/${userId}`)
          .then(res => res.data)
      )
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      userId,
      totalHours: expect.any(Number),
      projects: expect.arrayContaining([
        expect.objectContaining({
          projectId: expect.any(String),
          projectName: expect.any(String),
          totalHours: expect.any(Number),
          percentage: expect.any(Number),
        }),
      ]),
    });

    // Verify percentages sum to ~100
    const totalPercentage = result.current.data.projects
      .reduce((sum, p) => sum + p.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  test('fetches upcoming holidays', async () => {
    const { result } = renderHook(() =>
      useQuery(['holidays'], () =>
        axios.get('/api/v1/holidays', {
          params: { upcoming: true, limit: 5 }
        }).then(res => res.data)
      )
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      data: expect.any(Array),
      meta: {
        page: 1,
        limit: 5,
        total: expect.any(Number),
      },
    });

    // Verify all holidays are in the future
    const today = new Date().toISOString().split('T')[0];
    result.current.data.data.forEach(holiday => {
      expect(holiday.date >= today).toBe(true);
    });
  });
});
```

---

## Integration Guide

### Best Practices

1. **Parallel Requests**: All three endpoints can be called in parallel for dashboard load:
   ```typescript
   const [weeklyStats, projectStats, holidays] = await Promise.all([
     getWeeklyStats(userId, weekStart),
     getUserProjectStats(userId),
     getHolidays({ upcoming: true, limit: 5 }),
   ]);
   ```

2. **Caching**: Use query caching (React Query, SWR, etc.) to minimize API calls:
   ```typescript
   const { data: weeklyStats } = useQuery(
     ['weeklyStats', userId, weekStart],
     () => getWeeklyStats(userId, weekStart),
     { staleTime: 5 * 60 * 1000 } // 5 minutes
   );
   ```

3. **Error Boundaries**: Wrap dashboard components with error boundaries to handle API failures gracefully.

4. **Loading States**: Show skeleton loaders while fetching data:
   ```typescript
   if (isLoading) return <DashboardSkeleton />;
   if (error) return <ErrorMessage error={error} />;
   return <Dashboard data={data} />;
   ```

5. **Date Handling**: Use libraries like `date-fns` or `dayjs` for date manipulation:
   ```typescript
   import { startOfWeek, format } from 'date-fns';

   const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
   ```

### React Hook Example

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useDashboardData = (userId: string) => {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const weeklyStats = useQuery({
    queryKey: ['weeklyStats', userId, weekStart],
    queryFn: () => axios.get(`/api/v1/time-entries/stats/weekly/${userId}/${weekStart}`)
      .then(res => res.data),
  });

  const projectStats = useQuery({
    queryKey: ['projectStats', userId],
    queryFn: () => axios.get(`/api/v1/time-entries/stats/user-projects/${userId}`)
      .then(res => res.data),
  });

  const holidays = useQuery({
    queryKey: ['holidays', 'upcoming'],
    queryFn: () => axios.get('/api/v1/holidays', {
      params: { upcoming: true, limit: 5 }
    }).then(res => res.data),
  });

  return {
    weeklyStats,
    projectStats,
    holidays,
    isLoading: weeklyStats.isLoading || projectStats.isLoading || holidays.isLoading,
    error: weeklyStats.error || projectStats.error || holidays.error,
  };
};
```

---

## Answers to Frontend Team Questions

### Q1: What's your estimated timeline for Stories 1 & 2?
**A:** ✅ **COMPLETED** - Both stories are fully implemented and tested.

### Q2: Do you prefer separate endpoints or combined dashboard endpoint?
**A:** **Separate endpoints** (Stories 1-3). This provides:
- Better REST principles
- Individual caching strategies
- Flexibility for different use cases
- Easier testing and maintenance

Story 4 (combined endpoint) is **optional** and can be added later if performance metrics show it's needed.

### Q3: Should weekStartDate always be Monday?
**A:** **Configurable per tenant**. The system uses `timesheet_policies.week_start_policy`:
- 0 = Sunday
- 1 = Monday (default)
- 2 = Tuesday, etc.

All calculations respect this setting. However, when providing `weekStartDate` as input, ensure it aligns with your tenant's policy.

### Q4: For percentage calculations, should we round to 2 decimal places?
**A:** **Yes**, all percentages are rounded to 2 decimal places (e.g., 28.24%). The API handles this automatically.

---

## Notes

- All endpoints require authentication via session token
- Dates are in UTC timezone
- All numeric values are rounded to 2 decimal places where applicable
- The API supports multi-tenancy; ensure proper tenant context in session
- For bulk operations, use the standard pagination parameters (`page`, `limit`)

---

## Support

For questions or issues, please:
1. Check the Swagger documentation at `/api/docs`
2. Review the CLAUDE.md file for project conventions
3. Contact the backend team via the project's issue tracker

---

**Last Updated:** 2025-10-29
**API Version:** 1.0
**Document Version:** 1.0
