# n8n Automation Templates for GoWater

## Available Workflows

### 1. Attendance → Slack Tracker (`attendance-slack-tracker.json`)

Posts real-time attendance updates to a Slack channel, categorized by employee.

**Events handled:**
- Check In → posts employee name, ID, location, time
- Check Out → posts employee name, ID, total hours worked
- Break Started → posts employee name, ID, break start time
- Break Ended → posts employee name, ID, break duration

**Sample Slack messages:**

```
✅ Check In

Employee: Anne (R-001)
Date: 2026-02-12
Location: Onsite
Time: 09:00 AM
```

```
🚪 Check Out

Employee: Anne (R-001)
Date: 2026-02-12
Total Hours: 8.50h
Check Out: 05:30 PM
```

```
☕ Break Started

Employee: Anne (R-001)
Date: 2026-02-12
Break Start: 12:00 PM
```

```
▶️ Break Ended

Employee: Anne (R-001)
Date: 2026-02-12
Break Duration: 45 min
Total Break Today: 45 min
```

---

## Setup Instructions

### Step 1: Import the Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Add workflow** → **Import from file**
3. Select the `.json` file from this folder
4. The workflow will appear with all nodes pre-configured

### Step 2: Configure Slack Credentials

1. In n8n, go to **Credentials** → **Add credential** → **Slack API**
2. Create a Slack app at https://api.slack.com/apps with these scopes:
   - `chat:write` — post messages
   - `channels:read` — find channels
3. Install the app to your workspace and copy the Bot Token
4. Paste the token in n8n's Slack credential
5. Update each Slack node in the workflow to use your credential

### Step 3: Create the Webhook in GoWater

1. Go to **GoWater Admin** → **Webhooks** tab
2. Click **Add Webhook**
3. Fill in:
   - **Name:** `n8n Attendance Tracker`
   - **URL:** Copy the webhook URL from n8n (shown in the Webhook Receiver node when you click "Listen for test event")
   - **Events:** Select all 4 Attendance events:
     - `checked_in`, `checked_out`, `break_started`, `break_ended`
   - **Secret:** (optional) Add a shared secret for signature verification
4. Click **Create Webhook**
5. Click the **Test** button to verify connectivity

### Step 4: Activate

1. In n8n, toggle the workflow to **Active**
2. In GoWater, make sure the webhook is toggled **On**
3. When any employee checks in/out or takes a break, Slack will be notified instantly

---

## Webhook Payload Reference

Every webhook from GoWater arrives as a POST with this structure:

```json
{
  "event": "attendance.checked_in",
  "timestamp": "2026-02-12T01:00:00.000Z",
  "data": {
    "userId": 5,
    "employeeId": "R-001",
    "employeeName": "Anne",
    "date": "2026-02-12",
    "workLocation": "Onsite",
    "notes": null
  }
}
```

**Headers included:**
- `Content-Type: application/json`
- `X-Webhook-Event: attendance.checked_in`
- `X-Webhook-Id: 3`
- `X-Webhook-Signature: sha256=...` (only if secret is configured)

---

## Customization Ideas

- **Google Sheets logging:** Add a Google Sheets node after each event to build an attendance spreadsheet
- **Late check-in alert:** Add a condition node: if check-in time > 9:00 AM, send a different Slack message to #hr-alerts
- **Daily summary:** Use n8n's Cron trigger to call GoWater's API at 6 PM and post a daily attendance summary
- **Microsoft Teams:** Replace Slack nodes with Teams nodes — same workflow, different destination
