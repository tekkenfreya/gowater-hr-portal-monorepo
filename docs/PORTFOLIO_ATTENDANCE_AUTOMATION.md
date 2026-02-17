# Attendance Automation System

> **Stack:** Next.js 15 · TypeScript · Supabase · n8n · Slack Bot API · Google Sheets · Expo React Native
>
> **Role:** Full-stack engineer — designed and built the entire system end-to-end

---

## The Problem

A 20+ person field operations team was tracking attendance manually — text messages, spreadsheets, and managers chasing down who was late or missing. No real-time visibility, no audit trail, and daily summary reports took 30 minutes to compile by hand.

## The Solution

A fully automated attendance pipeline where employees check in from a mobile app, and every event flows through a webhook engine into Slack (threaded messages, late alerts, daily summaries) and Google Sheets (audit log) with zero manual intervention.

---

## How It Works

```
EMPLOYEE ACTION          WEBHOOK ENGINE              n8n WORKFLOW                OUTPUTS
─────────────────        ──────────────              ────────────                ───────

Employee checks in  ──→  Webhook fires with event  ──→  Verify HMAC signature
                         "attendance.checked_in"    ──→  Route by event type
                                                    ──→  Check if late (> 9 AM)
                                                    ──→  Format Slack blocks     ──→  Slack: check-in message
                                                    ──→  Save thread ID back     ──→  DB: slack_thread_ts
                                                    ──→  Log to audit sheet      ──→  Google Sheets row

Employee starts     ──→  "attendance.break_started" ──→  Verify → Route
  break                                             ──→  Check break compliance  ──→  Slack: reply in thread
                                                    ──→  Log to audit sheet      ──→  Google Sheets row

Employee ends       ──→  "attendance.break_ended"   ──→  Verify → Route          ──→  Slack: reply in thread
  break                                             ──→  Log to audit sheet      ──→  Google Sheets row

Employee checks     ──→  "attendance.checked_out"   ──→  Verify → Route
  out                                               ──→  Calculate hours + OT    ──→  Slack: reply in thread
                                                    ──→  Log to audit sheet      ──→  Google Sheets row

Daily 8 AM cron     ──────────────────────────────→  Post date divider          ──→  Slack: "── Feb 16 ──"

Daily 6 PM cron     ──────────────────────────────→  Fetch /api/attendance/
                                                       daily-summary
                                                    ──→  Build summary report    ──→  Slack: summary message
                                                    ──→  Post absent list        ──→  Slack: absent names
                                                    ──→  Log daily totals        ──→  Google Sheets row
```

---

## Webhook Engine

**File:** `apps/web/src/lib/webhooks.ts`

The webhook engine is a TypeScript service that fires HTTP POST requests to registered URLs whenever an event occurs in the system. It's designed to be reliable without blocking the main application.

### Event Delivery Flow

```
fireEvent("attendance.checked_in", payload)
  │
  ├── Query all active webhooks from database
  ├── Filter to those subscribed to this event (or wildcard "*")
  │
  └── For each matching webhook (in parallel):
        │
        ├── Check circuit breaker — skip if open
        │
        ├── Build payload envelope:
        │     { event, timestamp, data: { userId, userName, checkInTime, ... } }
        │
        ├── Generate HMAC-SHA256 signature (if secret is configured):
        │     X-Webhook-Signature: sha256=<hex digest of body>
        │
        ├── POST to webhook URL with 10s timeout
        │
        ├── On success (2xx):
        │     → Reset circuit breaker
        │     → Log delivery (status, response, duration, attempt number)
        │
        └── On failure:
              → Retry up to 3 attempts with exponential backoff
                  Attempt 1: immediate
                  Attempt 2: ~1s + jitter
                  Attempt 3: ~2s + jitter
              → After 3 failures: record failure in circuit breaker
              → After 5 consecutive failures: open circuit (5-minute cooldown)
              → After 20 consecutive failures: auto-disable the webhook
              → Log final failure with error details
```

### Key Constants

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Max attempts | 3 | Retries per delivery |
| Base delay | 1,000 ms | Exponential backoff base |
| Circuit threshold | 5 failures | Opens the circuit breaker |
| Circuit cooldown | 5 minutes | How long circuit stays open |
| Auto-disable threshold | 20 failures | Permanently disables webhook |
| Request timeout | 10 seconds | Per-attempt HTTP timeout |

### What Gets Logged

Every delivery attempt is recorded in `webhook_logs`:

```
webhook_id, event, payload, response_status, response_body (truncated to 1KB),
success, error_message, duration_ms, attempt, max_attempts, created_at
```

Admins can filter logs by webhook, event type, success/failure, and date range — with pagination.

---

## API Key System

**File:** `apps/web/src/lib/apiKeys.ts`

Workflow tools like n8n need long-lived credentials. JWT tokens expire in hours and require login — not practical for automation. The API key system provides persistent, scoped authentication.

### How Keys Work

```
CREATION (admin dashboard):
  1. Generate 48 random bytes → base64url encode → prefix with "gw_"
     Result: "gw_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
  2. Store the first 8 chars as key_prefix (for identification in UI)
  3. Hash the full key with SHA-256 → store only the hash
  4. Return the plaintext key ONCE — it's never stored or shown again
  5. Admin copies the key into n8n's HTTP header configuration

VALIDATION (every API request):
  1. Extract X-API-Key header from request
  2. Take first 8 chars → indexed lookup in api_keys table
  3. Hash the full provided key → compare to stored hash
  4. Check: is_active = true, not expired
  5. Return userId and scopes (read / write / admin)
  6. Update last_used_at in background (non-blocking)
```

### Unified Auth Helper

**File:** `apps/web/src/lib/authHelper.ts`

A single `authenticateRequest()` function handles all three auth methods in priority order:

```
1. X-API-Key header    → API key validation (for n8n, Zapier, GHL)
2. Authorization: Bearer → JWT verification (for mobile app)
3. auth-token cookie    → JWT verification (for web app)
```

API routes call one function and get back `{ userId, role, scopes }` regardless of auth method. Scoped permissions let n8n have read+write access without full admin privileges.

---

## n8n Workflow — Node by Node

The workflow has 29 nodes organized into event processing branches and scheduled jobs.

### Webhook Reception & Validation

| Node | Type | What It Does |
|------|------|-------------|
| **Webhook Receiver** | Webhook | Listens for POST requests from the GoWater webhook engine |
| **Verify HMAC Signature** | Code | Recomputes SHA-256 HMAC of the request body using the shared secret and compares it to the `X-Webhook-Signature` header. Rejects tampered payloads. |
| **Respond OK** | Respond to Webhook | Returns 200 immediately so the webhook engine doesn't retry |
| **Valid Attendance Event?** | If | Filters out non-attendance events (task, leave, lead events are ignored) |
| **Route by Event** | Switch | Routes to the correct processing branch based on event type: `checked_in`, `checked_out`, `break_started`, `break_ended` |

### Check-In Branch

| Node | What It Does |
|------|-------------|
| **Check Late Arrival** | Compares check-in time to 9:00 AM PHT. Calculates minutes late. |
| **Is Late?** | Branches: if late → post alert; if on time → skip |
| **Slack: Late Alert** | Posts a warning message to the attendance channel noting who was late and by how much |
| **Format Check-In Blocks** | Builds Slack Block Kit message with employee name, time, location, and photo |
| **Slack: Check In** | Posts the formatted check-in message to the attendance Slack channel |
| **Save Thread TS** | Calls `POST /api/attendance/slack-thread` with the Slack message timestamp, so subsequent events (break, checkout) thread under this message |

### Break Branch

| Node | What It Does |
|------|-------------|
| **Slack: Break Start** | Posts a reply in the employee's check-in thread noting break started |
| **Check Break Compliance** | Evaluates break duration rules (e.g., break longer than 1 hour) |
| **Compliance Issue?** | Branches based on whether a compliance rule was violated |
| **Slack: Compliance Alert** | Posts a warning if break exceeded allowed duration |
| **Slack: Break End** | Posts a reply in the thread noting break ended with total break time |

### Check-Out Branch

| Node | What It Does |
|------|-------------|
| **Calculate Hours & OT** | Computes net working hours, subtracts break time, calculates overtime beyond 8 hours |
| **Format Check-Out Blocks** | Builds Slack Block Kit message with total hours, overtime, and break summary |
| **Slack: Check Out** | Posts the formatted checkout as a reply in the check-in thread |

### Audit Logging

| Node | What It Does |
|------|-------------|
| **Google Sheets: Audit Log** | Appends a row for every attendance event — employee, event type, timestamp, details. Creates a complete audit trail. |

### Scheduled Jobs (Cron)

| Node | What It Does |
|------|-------------|
| **Daily 8 AM PHT** | Cron trigger that fires at 8:00 AM Philippines time |
| **Format Divider Date** | Generates a formatted date string for the divider |
| **Slack: Daily Divider** | Posts a visual separator in the channel: `──── Monday, February 16 ────` |
| **Daily 6 PM PHT** | Cron trigger that fires at 6:00 PM Philippines time |
| **Fetch Daily Summary** | Calls `GET /api/attendance/daily-summary` using an API key to get all employee statuses |
| **Build Daily Report** | Aggregates: total present, late count, average hours, overtime totals, who's still on break |
| **Route Daily Output** | Routes to summary and absent list posting |
| **Slack: Daily Summary** | Posts the full daily attendance report to the channel |
| **Slack: Absent List** | Posts a separate message listing employees who never checked in and aren't on leave |
| **Google Sheets: Daily Summary** | Appends a summary row with date, headcount, late count, average hours |

---

## Daily Summary API

**File:** `apps/web/src/app/api/attendance/daily-summary/route.ts`

A dedicated endpoint that n8n calls at 6 PM to build the daily report. Returns structured data for every active employee:

```
GET /api/attendance/daily-summary?date=2026-02-16

Response:
{
  "date": "2026-02-16",
  "employees": [
    {
      "name": "Juan Dela Cruz",
      "checked_in": true,
      "checked_out": true,
      "on_break": false,
      "is_late": true,
      "minutes_late": 15,
      "net_hours": 8.5,
      "overtime_hours": 0.5,
      "break_minutes": 60,
      "on_leave": false
    },
    ...
  ]
}
```

Cross-references attendance records with the user list and approved leave requests to distinguish between absent and on-leave employees.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Mobile App** | Expo React Native | Employee-facing app for check-in/out with photo capture |
| **Web Dashboard** | Next.js 15 (App Router) | Admin panel for attendance management, webhooks, API keys |
| **API** | Next.js API Routes + TypeScript | REST endpoints with unified auth (JWT + API keys) |
| **Database** | Supabase (PostgreSQL) | Attendance records, users, webhooks, API keys, logs |
| **Automation Engine** | n8n (self-hosted) | Visual workflow that routes events to Slack and Sheets |
| **Notifications** | Slack Bot API (Block Kit) | Threaded messages, alerts, daily summaries |
| **Audit Trail** | Google Sheets API | Append-only log for compliance and management review |
| **Photo Storage** | Cloudinary | Check-in/out photos with GPS + timestamp watermarks |

---

## Screenshots

[Screenshot: n8n workflow canvas showing the full 29-node attendance automation]

[Screenshot: Slack channel with threaded attendance messages — check-in, break, and checkout under one thread]

[Screenshot: Slack daily summary message with attendance stats and absent list]

[Screenshot: Admin dashboard — Webhooks management tab with delivery logs]

[Screenshot: Admin dashboard — API Keys management tab]

[Screenshot: Google Sheets audit log with attendance event rows]

[Screenshot: Mobile app — employee check-in screen with photo capture]

---

## Key Engineering Decisions

**HMAC-SHA256 signature verification** — Every webhook delivery is signed with a shared secret. The n8n workflow verifies the signature before processing, preventing spoofed events from external sources.

**Circuit breaker pattern** — If a webhook endpoint goes down, the system stops hammering it after 5 failures and waits 5 minutes before retrying. After 20 consecutive failures, the webhook is auto-disabled entirely. This protects both the application and the downstream service.

**Threaded Slack messages** — Instead of flooding the channel with separate messages, each employee's day is a single thread. Check-in is the parent message; break start, break end, and checkout are replies. The thread timestamp is saved back to the database via an API callback from n8n.

**Prefix-indexed API keys** — Keys are stored as SHA-256 hashes (never plaintext). The first 8 characters are indexed separately, so validation requires only one fast indexed query instead of hashing against every key in the table.

**Fire-and-forget delivery** — Webhook deliveries run in the background with `Promise.allSettled()`. An employee's check-in response is never delayed by webhook processing, even if a downstream service is slow.

**Unified auth helper** — One function handles API keys, Bearer tokens, and cookies. API routes don't need to know which auth method is being used — they just get a userId and scopes back.

**Exponential backoff with jitter** — Retry delays double each attempt with random jitter to prevent thundering herd when multiple webhooks fail simultaneously.

**Philippines timezone handling** — All time calculations use manual UTC+8 offset (`getTime() + 8 * 60 * 60 * 1000`) instead of `toLocaleTimeString()`, which is unreliable in serverless environments (Vercel).
