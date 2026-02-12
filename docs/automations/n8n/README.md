# n8n Automation Templates for GoWater

## What is n8n?

n8n (pronounced "n-eight-n") is an open-source workflow automation tool — similar to Zapier but self-hosted and free. It lets you connect apps together: "when X happens in App A, do Y in App B."

In our case: **when an employee checks in/out in GoWater → post a message in Slack.**

---

## Installing & Running n8n

### Option A: Run Locally with npm (Quickest for Testing)

**Prerequisites:** Node.js 18+ installed

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start
```

n8n opens at **http://localhost:5678**. Create an account (local only, just for you).

### Option B: Run with Docker (Recommended for Production)

```bash
# Pull and run n8n with persistent data
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

Open **http://localhost:5678** and create your account.

### Option C: n8n Cloud (No Setup Required)

Go to **https://n8n.io/cloud** and sign up. Free tier available. No installation needed — runs in the browser.

---

## Important: Making Your n8n Webhook Reachable

GoWater (deployed on Vercel) needs to send webhooks TO your n8n instance. This means:

- **n8n Cloud:** Works out of the box — your webhook URL is already public (e.g. `https://your-name.app.n8n.cloud/webhook/gowater-attendance`)
- **Local/Docker n8n:** Your `localhost:5678` is NOT reachable from the internet. You need a tunnel:

```bash
# Option 1: Use ngrok (free)
ngrok http 5678
# Gives you a public URL like: https://abc123.ngrok-free.app
# Your webhook URL becomes: https://abc123.ngrok-free.app/webhook/gowater-attendance

# Option 2: Use Cloudflare Tunnel (free)
cloudflared tunnel --url http://localhost:5678
```

Copy the public tunnel URL and use it as the webhook URL in GoWater admin.

---

## First Time in n8n — Quick Orientation

When you open n8n for the first time:

1. **Create your account** — email + password (local only, not shared anywhere)
2. You land on the **Workflows** page — this is your dashboard
3. Key areas:
   - **Workflows** (left sidebar) — where your automations live
   - **Credentials** (left sidebar) — where you store API keys/tokens for Slack, Google Sheets, etc.
   - **Executions** (left sidebar) — logs of every workflow run (great for debugging)
4. Inside a workflow:
   - The canvas has **nodes** (colored boxes) connected by lines
   - Each node does one thing: receive webhook, check a condition, send a Slack message
   - Click a node to configure it
   - Click **Test workflow** (top right) to run it manually
   - Toggle **Active** (top right) to make it run automatically on real events

---

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
