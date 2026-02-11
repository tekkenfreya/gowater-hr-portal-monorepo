# GoWater Webhook Workflow Portfolio

> Automation workflows powered by GoWater's webhook system integrated with Zapier, n8n, and GoHighLevel (GHL).

---

## Why Three Platforms?

| Platform | Best For | Strength |
|----------|----------|----------|
| **Zapier** | Business-user friendly automations, SaaS-to-SaaS | 7,000+ app integrations, zero-code, fastest setup |
| **n8n** | Complex logic, data transformation, self-hosted control | Full code access, conditional branching, free self-hosted, no execution limits |
| **GoHighLevel** | CRM pipeline automation, client communication, sales funnels | Built-in CRM, SMS/email/voicemail drops, pipeline stages, lead nurturing |

**The strategy:** Use each platform where it excels. Zapier for simple SaaS bridges, n8n for heavy logic and data processing, GHL for client-facing CRM and communication workflows.

---

## Workflow 1: Smart Attendance Monitoring & Escalation

**Platform:** n8n (complex branching logic + multiple conditions)

**Why n8n:** This workflow requires conditional branching (if late → check how late → escalate accordingly), time calculations, database lookups, and multi-step decision trees. Zapier would need 4-5 separate Zaps. n8n handles it in one flow with IF/Switch nodes.

**Trigger:** `attendance.checked_in`

**Flow:**
```
attendance.checked_in webhook received
    │
    ├─ n8n Code Node: Parse check-in time, calculate if late
    │
    ├─ IF Node: Is employee late? (check-in after 9:00 AM PHT)
    │   │
    │   ├─ YES → Switch Node: How late?
    │   │   │
    │   │   ├─ 1-15 min → Slack DM to employee: "You checked in at {time}"
    │   │   │
    │   │   ├─ 15-60 min → Slack DM to employee + Slack message to #hr-alerts
    │   │   │             + Google Sheets: Log late arrival
    │   │   │
    │   │   └─ 60+ min → Slack #hr-alerts (urgent) + Email to HR Manager
    │   │                + Google Sheets log + Create follow-up task in GoWater
    │   │
    │   └─ NO → Google Sheets: Log on-time arrival (for streak tracking)
    │
    ├─ n8n Code Node: Check if 3+ late arrivals this week
    │   │
    │   └─ YES → Generate warning email to employee + CC HR
    │            + Update Google Sheet "Warnings" tab
    │
    └─ HTTP Node: Post daily summary to Slack #attendance at 10:30 AM
       (aggregated via n8n Cron trigger + stored data)
```

**Data flow example:**
```json
// Incoming webhook payload
{
  "event": "attendance.checked_in",
  "timestamp": "2026-02-11T01:30:00Z",
  "data": {
    "userId": 5,
    "date": "2026-02-11",
    "workLocation": "office",
    "notes": null
  }
}

// n8n transforms to:
{
  "employee": "Juan Dela Cruz",
  "checkInTime": "9:30 AM PHT",
  "minutesLate": 30,
  "lateCountThisWeek": 2,
  "workLocation": "office",
  "severity": "moderate"
}
```

---

## Workflow 2: End-of-Day Automated Report Generation

**Platform:** n8n (heavy data aggregation + PDF generation + multi-destination output)

**Why n8n:** Requires aggregating multiple webhook events throughout the day, performing calculations (total hours, break compliance, task completion rates), generating formatted reports, and distributing to multiple channels. n8n's built-in data store and code nodes handle this natively.

**Triggers:** `attendance.checked_out` + Cron (6:00 PM daily fallback)

**Flow:**
```
attendance.checked_out received (or 6:00 PM Cron trigger)
    │
    ├─ HTTP Request Node: Fetch today's full attendance data via GoWater API
    │   (using API key: gw_xxxxx with read scope)
    │
    ├─ HTTP Request Node: Fetch today's completed tasks via GoWater API
    │
    ├─ Code Node: Aggregate data
    │   - Total employees checked in
    │   - Average hours worked
    │   - Break compliance (breaks > 1hr flagged)
    │   - Task completion rate
    │   - Employees who didn't check out (flag as absent)
    │   - Overtime calculations
    │
    ├─ HTML Node: Generate formatted HTML report
    │
    ├─ Split output to 3 destinations:
    │   │
    │   ├─ Gmail Node: Email PDF report to management@gowater.com
    │   │
    │   ├─ Slack Node: Post summary card to #daily-reports
    │   │   "Today: 12/15 checked in | Avg 8.2hrs | 85% tasks done | 2 flagged"
    │   │
    │   └─ Google Sheets Node: Append daily row to "Monthly Attendance Tracker"
    │       (for month-end payroll processing)
    │
    └─ IF Node: Any employee worked > 10 hours?
        │
        └─ YES → Slack DM to HR: "Overtime alert: {names} worked {hours}hrs"
```

---

## Workflow 3: Lead-to-Client Nurture Pipeline

**Platform:** GoHighLevel (CRM pipeline + automated communication sequences)

**Why GHL:** This is a sales/CRM workflow. GHL has built-in pipeline stages, SMS/email sequences, voicemail drops, appointment booking, and lead scoring — all native. Building this in Zapier would need 15+ Zaps. n8n could do it but lacks native CRM, SMS gateway, and appointment scheduling.

**Trigger:** `lead.created` + `lead.status_changed`

**Flow:**
```
lead.created webhook received in GHL
    │
    ├─ GHL: Create/update contact in CRM
    │   - Map GoWater lead fields → GHL contact fields
    │   - Tag: "gowater-lead", category, assigned rep
    │
    ├─ GHL: Move to Pipeline Stage "New Lead"
    │
    ├─ GHL: Trigger "New Lead Nurture" Sequence:
    │   │
    │   ├─ Immediately → SMS: "Hi {name}, thanks for your interest in GoWater!
    │   │                       Our rep {assignedTo} will reach out shortly."
    │   │
    │   ├─ +5 min → Ringless Voicemail Drop (pre-recorded intro message)
    │   │
    │   ├─ +1 hour → Email: Welcome + service brochure PDF
    │   │
    │   ├─ +24 hours → SMS: "Did you have any questions about our water services?"
    │   │
    │   ├─ +3 days → Email: Case study / testimonials
    │   │
    │   └─ +7 days → SMS: "Limited time offer - 10% off first month"
    │                + GHL: Move to "Follow Up" pipeline stage
    │
    ├─ GHL: Assign to rep's calendar for callback
    │   - Auto-book 15min slot in next available window
    │
    └─ GHL: Lead Scoring
        - +10 points: Lead created
        - +20 points: Email opened
        - +30 points: Link clicked
        - +50 points: Replied to SMS
        → Score > 80 → Move to "Hot Lead" stage → Alert sales rep

---

lead.status_changed webhook received
    │
    ├─ IF status = "qualified"
    │   └─ GHL: Move to "Qualified" pipeline stage
    │      + Send proposal email template
    │      + Create task for rep: "Send custom quote within 24hrs"
    │
    ├─ IF status = "converted"
    │   └─ GHL: Move to "Won" stage
    │      + Trigger "New Customer Onboarding" sequence
    │      + SMS: "Welcome aboard! Here's your onboarding guide: {link}"
    │      + Internal Slack notification (via GHL webhook action)
    │
    └─ IF status = "lost"
        └─ GHL: Move to "Lost" stage
           + Trigger "Win-Back" sequence (starts in 30 days)
           + Tag: "lost-lead-{reason}"
           + Remove from active sequences
```

---

## Workflow 4: Task Management → Project Tracking Sync

**Platform:** Zapier (straightforward SaaS-to-SaaS mapping)

**Why Zapier:** Simple data mapping between GoWater tasks and project management tools. No complex logic needed — just "when this happens, create/update that." Zapier's pre-built integrations with Notion, Asana, Monday.com, and Trello make this a 5-minute setup.

**Triggers:** `task.created` + `task.updated` + `task.completed`

**Flow:**
```
task.created webhook → Zapier
    │
    ├─ Zap 1: GoWater → Notion Database
    │   - Create new row in "GoWater Tasks" database
    │   - Map: title → Name, priority → Priority select, status → Status
    │   - Add relation to employee page
    │
    ├─ Zap 2: GoWater → Slack #task-updates
    │   - "New task assigned to {employee}: {title} [{priority}]"
    │
    └─ Zap 3: GoWater → Google Calendar (if high/urgent priority)
        - Create event blocking 1hr for focused work

---

task.completed webhook → Zapier
    │
    ├─ Zap 4: Update Notion row → Status = "Done"
    │
    ├─ Zap 5: Slack #wins channel
    │   - "🏆 {employee} completed: {title}"
    │
    └─ Zap 6: Filter (Zapier) → If all tasks for today done
        └─ Slack DM to manager: "{employee} completed all tasks today"
```

---

## Workflow 5: Leave Management + Calendar + Payroll Sync

**Platform:** n8n (multi-system sync with error handling and rollback logic)

**Why n8n:** This workflow touches 4+ systems (Google Calendar, Slack, payroll spreadsheet, backup notifications) and needs error handling — if calendar sync fails, it shouldn't block the Slack notification. n8n's error handling branches and retry logic handle this. Zapier's linear flow would break on the first failure.

**Triggers:** `leave.requested` + `leave.approved` + `leave.rejected`

**Flow:**
```
leave.requested webhook
    │
    ├─ Slack Node: Post to #leave-requests
    │   "📋 {employee} requested {type} leave: {startDate} - {endDate}"
    │   + Interactive buttons: [Approve] [Reject] (Slack Block Kit)
    │
    ├─ Email Node: Notify direct manager
    │   Subject: "Leave Request from {employee} - Action Required"
    │
    └─ Google Sheets: Log to "Leave Tracker" spreadsheet

---

leave.approved webhook
    │
    ├─ Google Calendar Node: Create "OOO" event
    │   - All-day event on employee's calendar
    │   - Invite team members for visibility
    │   │
    │   └─ Error Branch: If calendar sync fails
    │       → Email admin: "Calendar sync failed for {employee} leave"
    │       → Continue with other steps (don't block)
    │
    ├─ Slack Node: Update original message with "APPROVED" tag
    │   + Post to #general: "{employee} is on leave {dates}"
    │
    ├─ Google Sheets Node: Update leave balance
    │   - Deduct days from remaining leave quota
    │   - Flag if balance goes negative
    │
    ├─ n8n Code Node: Calculate payroll impact
    │   - Paid vs unpaid leave
    │   - Pro-rata salary adjustment
    │   - Output: payroll adjustment record
    │
    └─ Google Sheets Node: Add row to "Payroll Adjustments" sheet

---

leave.rejected webhook
    │
    ├─ Slack Node: Update message with "REJECTED" tag
    ├─ Email to employee: "Your leave request was not approved. Reason: {reason}"
    └─ Google Sheets: Update status to "Rejected"
```

---

## Workflow 6: Real-Time Operations Dashboard

**Platform:** n8n (WebSocket support + data aggregation + custom API)

**Why n8n:** This workflow collects ALL webhook events, processes them in real-time, and pushes updates to a live dashboard. Requires persistent state, WebSocket connections, and custom API endpoints that n8n provides natively. Zapier has no WebSocket support. GHL can't build custom dashboards.

**Triggers:** `*` (wildcard — all events)

**Flow:**
```
ALL events via wildcard webhook
    │
    ├─ Switch Node: Route by event type
    │   │
    │   ├─ attendance.* → Attendance Processor
    │   │   - Update "currently working" count
    │   │   - Update "on break" count
    │   │   - Calculate real-time average hours
    │   │
    │   ├─ task.* → Task Processor
    │   │   - Update completion rate
    │   │   - Track tasks created vs completed today
    │   │
    │   ├─ lead.* → Lead Processor
    │   │   - Update pipeline value
    │   │   - Track conversion rate
    │   │
    │   └─ leave.* → Leave Processor
    │       - Update team availability calendar
    │
    ├─ n8n Code Node: Aggregate into dashboard JSON
    │   {
    │     "workingNow": 12,
    │     "onBreak": 3,
    │     "avgHours": 6.5,
    │     "tasksCompleted": 28,
    │     "tasksPending": 15,
    │     "completionRate": "65%",
    │     "activeleads": 42,
    │     "onLeaveToday": ["Juan", "Maria"],
    │     "recentEvents": [...]
    │   }
    │
    └─ Output to 3 destinations:
        │
        ├─ Google Sheets: Live data sheet (auto-refreshes in Google Data Studio)
        │
        ├─ Slack: Hourly summary to #operations
        │   "📊 12 working | 3 on break | 65% tasks done | 42 active leads"
        │
        └─ Webhook Response Node: Expose as REST API
            GET /dashboard-data → Returns latest aggregated JSON
            (consumed by custom dashboard widget or TV display)
```

---

## Workflow 7: Employee Performance Scoring & Gamification

**Platform:** n8n + Zapier (n8n for scoring logic, Zapier for reward delivery)

**Why hybrid:** n8n handles the complex scoring algorithm (weighted calculations across attendance, tasks, and leads). Zapier handles the simple "send reward" actions to platforms it already integrates with (gift card APIs, badge systems).

**Triggers:** `attendance.checked_in` + `task.completed` + `lead.status_changed`

**Flow (n8n):**
```
Multiple event webhooks feed into scoring engine
    │
    ├─ n8n Code Node: Calculate daily score
    │   - On-time check-in: +10 points
    │   - Each task completed: +15 points
    │   - High-priority task completed: +25 points
    │   - Lead converted: +50 points
    │   - Full day without break violation: +5 points
    │   - Late check-in: -10 points
    │   - Missed checkout: -20 points
    │
    ├─ Google Sheets: Update "Leaderboard" sheet
    │   - Daily scores, weekly totals, monthly totals
    │   - Rank employees
    │
    ├─ IF Node: Weekly score > 200?
    │   └─ Zapier Webhook: Trigger reward Zap
    │       → Send congratulations email with digital gift card
    │       → Post to Slack #wins: "Star performer: {name} scored {score}!"
    │
    ├─ IF Node: Monthly rank = #1?
    │   └─ Zapier Webhook: Trigger "Employee of the Month" Zap
    │       → Email announcement to all staff
    │       → Update "Hall of Fame" Notion page
    │
    └─ Cron (Friday 5PM): Weekly leaderboard
        → Slack #general: Top 5 performers with scores
        → Email to management: Full leaderboard report
```

---

## Workflow 8: Client Communication & Follow-Up Automation

**Platform:** GoHighLevel (native multi-channel communication)

**Why GHL:** Requires SMS sequences, email drips, voicemail drops, Facebook Messenger, and WhatsApp — all from one platform with conversation tracking. No other tool has all these channels natively. n8n would need separate Twilio, SendGrid, WhatsApp Business API integrations.

**Trigger:** `lead.activity_logged`

**Flow:**
```
lead.activity_logged webhook (activityType = "site_visit")
    │
    ├─ GHL: Update contact → Tag "site-visited"
    │   Move pipeline stage → "Site Visited"
    │
    ├─ GHL: Trigger "Post-Visit" sequence:
    │   │
    │   ├─ Immediately → SMS: "Great meeting you today, {name}!
    │   │                       Here's the quote we discussed: {link}"
    │   │
    │   ├─ +2 hours → Email: Detailed proposal PDF
    │   │
    │   ├─ +1 day → WhatsApp: "Hi {name}, did you get a chance to
    │   │                       review the proposal?"
    │   │
    │   ├─ +3 days → IF no reply:
    │   │   ├─ Ringless Voicemail: "Hey {name}, just following up..."
    │   │   └─ SMS: "Any questions about the proposal? Happy to help!"
    │   │
    │   ├─ +5 days → IF no reply:
    │   │   └─ Email: Limited-time discount offer
    │   │
    │   └─ +7 days → IF no reply:
    │       └─ Task created for sales rep: "Manual follow-up needed for {name}"
    │          + Move to "Needs Attention" pipeline stage
    │
    ├─ GHL: IF reply received at any point:
    │   └─ Stop sequence → Notify rep → Move to "In Conversation"
    │
    └─ GHL: Conversation AI (optional):
        - Auto-respond to common questions
        - Book appointments automatically
        - Escalate complex queries to human rep
```

---

## Workflow 9: Break Compliance & Wellness Monitoring

**Platform:** n8n (time calculations + compliance rules + escalation logic)

**Why n8n:** Requires real-time time calculations (break duration tracking), compliance rule checking against labor laws, and multi-tier escalation. The code nodes in n8n can implement Philippine labor law break requirements (1-hour mandatory break for 8+ hour shifts).

**Triggers:** `attendance.break_started` + `attendance.break_ended` + `attendance.checked_out`

**Flow:**
```
attendance.break_started
    │
    ├─ n8n: Store break start time in workflow static data
    │
    └─ Cron Check (every 15 min): Is anyone on break > 90 minutes?
        │
        └─ YES → Slack DM to employee: "Your break has exceeded 90 minutes"
                 + Notify supervisor

---

attendance.break_ended
    │
    ├─ n8n Code Node: Calculate break duration
    │   - breakDuration = breakEnd - breakStart
    │
    ├─ IF: breakDuration < 30 min (for 8hr shift)?
    │   └─ Flag: "Short break - possible labor compliance issue"
    │      → Email HR: "Employee {name} only took {duration} break"
    │      → Google Sheets: Log compliance flag
    │
    ├─ IF: breakDuration > 2 hours?
    │   └─ Flag: "Extended break"
    │      → Slack to supervisor
    │      → Deduct excess from work hours calculation
    │
    └─ Google Sheets: Log break record

---

attendance.checked_out (end of day check)
    │
    ├─ n8n Code Node: Analyze full day
    │   - Total work hours
    │   - Total break time
    │   - Did employee take mandatory break?
    │   - Overtime calculation
    │
    ├─ IF: Worked 8+ hours with NO break taken
    │   └─ Compliance Alert → Email HR + Slack #compliance
    │      "LABOR COMPLIANCE: {name} worked {hours}hrs without recorded break"
    │
    └─ Google Sheets: Daily compliance report row
```

---

## Workflow 10: Multi-Channel Notification Hub

**Platform:** Zapier (simplest SaaS-to-SaaS routing)

**Why Zapier:** Pure notification routing — no logic, no transformation, just "event → send to channel." Zapier's pre-built integrations make each of these a 2-step Zap that takes 60 seconds to set up.

**Triggers:** Various events

```
Zap 1: attendance.checked_in → Microsoft Teams: "✅ {employee} checked in at {time}"
Zap 2: attendance.checked_out → Microsoft Teams: "🚪 {employee} checked out. Worked {hours}hrs"
Zap 3: task.completed → Discord #achievements: "{employee} completed: {taskTitle}"
Zap 4: lead.created → Telegram Bot: "New lead: {name} - {category}"
Zap 5: leave.approved → Google Calendar: Create OOO event
Zap 6: lead.converted → Slack #sales: "💰 New customer: {name}"
Zap 7: user.created → Email: Welcome email to new employee
Zap 8: task.created (urgent) → SMS via Twilio: "URGENT task assigned: {title}"
```

---

## Platform Comparison Summary

| Criteria | Zapier | n8n | GoHighLevel |
|----------|--------|-----|-------------|
| **Setup Speed** | Minutes | Hours | Hours |
| **Complex Logic** | Limited (Paths/Filters) | Unlimited (Code nodes) | Limited (IF/ELSE) |
| **Self-Hosted** | No | Yes | No |
| **Pricing** | Per-task pricing (expensive at scale) | Free self-hosted / paid cloud | Monthly flat rate |
| **CRM Built-in** | No | No | Yes |
| **SMS/Voice** | Via Twilio integration | Via Twilio integration | Native |
| **Best Workflow Count** | 4, 10 | 1, 2, 5, 6, 7, 9 | 3, 8 |
| **Ideal User** | Non-technical admin | Developer / DevOps | Sales / Marketing team |
| **Error Handling** | Basic retry | Advanced (branches, fallbacks) | Basic retry |
| **Data Transformation** | Formatter steps | Full JavaScript/Python | Limited |
| **Execution Limits** | 100-50,000/month (plan dependent) | Unlimited (self-hosted) | Unlimited |
| **Webhook Verification** | Manual setup | Native HMAC support | Manual setup |

### When to Use What

- **Zapier** → "I need this working in 5 minutes and it's a simple A→B connection"
- **n8n** → "I need complex logic, data processing, and full control over the workflow"
- **GHL** → "I need to communicate with leads/clients via SMS, email, voicemail, WhatsApp with CRM tracking"

---

## Setup Quick Start

### 1. Create API Key
```
POST /api/admin/api-keys
{
  "name": "Zapier Production",
  "scopes": ["read"],
  "expiresInDays": 365
}
→ Save the returned plaintextKey (shown only once)
```

### 2. Create Webhook
```
POST /api/admin/webhooks
{
  "name": "n8n Attendance Workflows",
  "url": "https://your-n8n-instance.com/webhook/gowater-attendance",
  "events": ["attendance.checked_in", "attendance.checked_out", "attendance.break_started", "attendance.break_ended"],
  "secret": "your-shared-secret-for-hmac"
}
```

### 3. Verify Delivery
```
POST /api/admin/webhooks/test
{ "webhookId": 1 }
→ Check webhook logs for successful delivery
```

### 4. Monitor
```
GET /api/admin/webhooks/logs?webhookId=1&success=false
→ View failed deliveries for debugging
```

---

## Available Webhook Events Reference

| Module | Event | Payload Fields |
|--------|-------|----------------|
| Attendance | `attendance.checked_in` | userId, date, workLocation, notes |
| Attendance | `attendance.checked_out` | userId, date, totalHours, checkOutTime |
| Attendance | `attendance.break_started` | userId, date, breakStartTime |
| Attendance | `attendance.break_ended` | userId, date, breakDurationSeconds, totalBreakDuration |
| Task | `task.created` | taskId, title, priority, assignedTo |
| Task | `task.updated` | taskId, changes |
| Task | `task.completed` | taskId, title, completedBy |
| Task | `task.deleted` | taskId |
| Leave | `leave.requested` | leaveId, userId, type, startDate, endDate |
| Leave | `leave.approved` | leaveId, userId, approvedBy |
| Leave | `leave.rejected` | leaveId, userId, rejectedBy, reason |
| Lead | `lead.created` | leadId, category, name, assignedTo |
| Lead | `lead.updated` | leadId, changes |
| Lead | `lead.status_changed` | leadId, newStatus, category |
| Lead | `lead.activity_logged` | activityId, leadId, activityType, description |
| User | `user.created` | userId, name, email, role |
| User | `user.updated` | userId, changes |
| User | `user.deleted` | userId |
