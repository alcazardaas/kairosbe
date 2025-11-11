# Message Template for Backend Team

## Slack Message (Copy & Paste)

```
Hey Backend Team! 👋

We've completed a major TypeScript cleanup on the frontend and identified an opportunity to improve our API alignment.

**Request:** Convert API responses from `snake_case` to `camelCase`

**Why it matters:**
• Eliminates 29 remaining TypeScript errors
• Aligns with JavaScript/TypeScript best practices
• Matches industry standards (GitHub, Stripe, Twilio all use camelCase)
• Significantly improves type safety and DX

**Example:**
❌ Current: `{ "user_id": "123", "week_start_date": "2025-01-13" }`
✅ Proposed: `{ "userId": "123", "weekStartDate": "2025-01-13" }`

**Main endpoints affected:**
• `/time-entries` - user_id, project_id, week_start_date, day_of_week
• `/timesheets` - week_start_date, submitted_at, time_entries
• `/tasks` - project_id, parent_task_id
• `/projects` - start_date, client_name
• `/leave-requests` - benefit_type_id, total_days

**Migration:** We've outlined a 4-week phased approach with backward compatibility.

📄 **Full details:** `apps/kairosfe/BACKEND_API_ALIGNMENT_REQUEST.md`
📊 **Quick summary:** `apps/kairosfe/BACKEND_API_ALIGNMENT_SUMMARY.md`

Can we schedule a quick sync to discuss implementation? Most frameworks have built-in camelCase serialization, so this should be straightforward! 🚀

cc: @backend-lead @api-team
```

---

## Email Subject

```
[API] Request: camelCase Naming Convention for API Responses
```

---

## Email Body

```
Hi Backend Team,

Following our recent TypeScript type safety improvements on the frontend, we'd like to request alignment on API response naming conventions.

SUMMARY
=======
We're requesting that all API endpoints return responses using camelCase instead of snake_case. This is the JavaScript/TypeScript industry standard and will resolve 29 remaining type safety errors.

THE PROBLEM
===========
Current API responses use snake_case:
{
  "user_id": "123",
  "week_start_date": "2025-01-13",
  "day_of_week": 1
}

This forces us to manually transform every response in the frontend, leading to:
- 29 TypeScript type errors
- Maintenance overhead
- Runtime error risks
- Poor developer experience

PROPOSED SOLUTION
=================
Return all responses in camelCase (JavaScript standard):
{
  "userId": "123",
  "weekStartDate": "2025-01-13",
  "dayOfWeek": 1
}

AFFECTED ENDPOINTS
==================
Primary endpoints requiring updates:
1. Time Entries API (/time-entries)
2. Timesheets API (/timesheets)
3. Tasks API (/tasks)
4. Projects API (/projects)
5. Leave Requests API (/leave-requests)

Complete property mapping is included in the attached documentation.

IMPLEMENTATION
==============
Most frameworks provide built-in camelCase serialization:
- Python: Pydantic alias_generator
- Node.js: camelcase-keys middleware
- .NET: JsonNamingPolicy.CamelCase
- Java: PropertyNamingStrategies

We've outlined a 4-week phased migration with backward compatibility to ensure smooth transition.

BENEFITS
========
✓ Eliminates 29 TypeScript errors
✓ Follows JavaScript industry standards
✓ Removes transformation overhead
✓ Improves type safety
✓ Better developer experience

FRONTEND COMMITMENT
===================
Once implemented:
- We'll update all types within 1 week
- Remove all transformation code
- Achieve 0 TypeScript errors
- Provide comprehensive testing support

DOCUMENTATION
=============
Detailed documentation is available at:
- Full request: apps/kairosfe/BACKEND_API_ALIGNMENT_REQUEST.md
- Executive summary: apps/kairosfe/BACKEND_API_ALIGNMENT_SUMMARY.md

Can we schedule a meeting to discuss implementation timeline and approach?

Best regards,
Frontend Team
```

---

## Meeting Agenda (if scheduling sync)

```
Meeting: API camelCase Migration Discussion
Duration: 30 minutes

AGENDA
======

1. Overview of Request (5 min)
   - Why camelCase matters for TypeScript
   - Current pain points

2. Demo of TypeScript Errors (5 min)
   - Show the 29 errors
   - Show how camelCase resolves them

3. Review Affected Endpoints (10 min)
   - Walk through property mappings
   - Discuss any special cases

4. Implementation Strategy (5 min)
   - Serialization approach
   - Backward compatibility
   - Testing plan

5. Timeline & Next Steps (5 min)
   - Agree on phased rollout
   - Assign ownership
   - Set milestone dates

PREPARATION
===========
Please review before meeting:
- BACKEND_API_ALIGNMENT_REQUEST.md (detailed)
- BACKEND_API_ALIGNMENT_SUMMARY.md (quick overview)
```

---

## Follow-up Template (After Discussion)

```
Thanks for the great discussion, team!

AGREED NEXT STEPS
==================
[ ] Backend: Review serialization approach for [framework]
[ ] Backend: Create spike/POC for time-entries endpoint
[ ] Frontend: Prepare type definitions for camelCase
[ ] Both: Set up shared test environment
[ ] Both: Schedule follow-up for [date]

TARGET MILESTONES
=================
Week 1: POC complete + staging deployment
Week 2: Frontend integration testing
Week 3: Production rollout (phased)
Week 4: Full migration complete

Let me know if I missed anything!
```
