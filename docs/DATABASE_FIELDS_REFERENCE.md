# Database Fields Reference

> **Last Updated:** 2026-01-28
> **Purpose:** Complete database schema with exact field names, types, and constraints
> **Usage:** Reference this when writing SQL queries, service methods, or type definitions
> **Source:** Extracted from live Supabase database using DATABASE_SCHEMA.sql
> **Recent Changes:** Migrated to Turborepo monorepo structure

---

## Monorepo Structure

```
gowater-monorepo/
├── apps/
│   ├── web/                 # Next.js web app (database access is here)
│   │   └── src/
│   │       └── lib/         # Database services (supabase.ts, auth.ts, etc.)
│   └── mobile/              # React Native Expo app (uses web API)
│       └── src/
├── packages/
│   └── types/               # Shared TypeScript types (@gowater/types)
│       └── src/
└── docs/                    # This documentation
```

**Database Access:**
- Web app: Direct Supabase access via `src/lib/supabase.ts`
- Mobile app: Accesses data via web API endpoints (no direct DB access)
- Shared types: `@gowater/types` package for type definitions

---

## Table of Contents

1. [announcements](#announcements) *(NEW)*
2. [attendance](#attendance)
3. [attendance_automation_settings](#attendance_automation_settings)
4. [attendance_edit_requests](#attendance_edit_requests) *(NEW)*
5. [custom_backgrounds](#custom_backgrounds)
6. [files](#files)
7. [lead_activities](#lead_activities)
8. [leads](#leads)
9. [leave_requests](#leave_requests)
10. [migration_log](#migration_log)
11. [notifications](#notifications)
12. [permissions](#permissions)
13. [report_type_config](#report_type_config)
14. [reports](#reports)
15. [status_config](#status_config)
16. [subtask_report_items](#subtask_report_items)
17. [task_report_items](#task_report_items)
18. [task_reports](#task_reports)
19. [tasks](#tasks)
20. [user_permissions](#user_permissions)
21. [users](#users)

---

## announcements

**Purpose:** System-wide announcements for employees (NEW)

**Primary Key:** `id`

**Foreign Keys:**
- `created_by` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Announcement ID |
| `title` | text | NO | - | Announcement title |
| `content` | text | NO | - | Announcement content/body |
| `priority` | text | YES | 'normal' | urgent, high, normal, low |
| `created_by` | integer | NO | - | Admin user ID who created |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |
| `expires_at` | timestamp with time zone | YES | - | Expiration date (null = never) |
| `is_active` | boolean | YES | true | Enable/disable announcement |
| `target_audience` | text | YES | 'all' | all, managers, employees |

---

## attendance

**Purpose:** Track daily employee attendance with check-in/out times and breaks

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('attendance_id_seq') | Unique attendance record ID |
| `user_id` | integer | NO | - | Employee user ID |
| `date` | date | NO | - | Attendance date (YYYY-MM-DD) |
| `check_in_time` | timestamp with time zone | YES | - | Check-in timestamp |
| `check_out_time` | timestamp with time zone | YES | - | Check-out timestamp |
| `total_hours` | real | YES | 0 | Total work hours (excluding breaks) |
| `status` | text | YES | 'absent' | present, absent, late, early-leave, holiday, leave |
| `notes` | text | YES | - | Optional attendance notes |
| `created_at` | timestamp with time zone | YES | now() | Record creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |
| `break_start_time` | timestamp with time zone | YES | - | Current break start time |
| `break_end_time` | timestamp with time zone | YES | - | Last break end time |
| `break_duration` | integer | YES | 0 | Total break time in seconds |
| `work_location` | text | YES | 'WFH' | WFH, Onsite, or Field |
| `sessions` | jsonb | YES | '[]' | Multiple check-in/out sessions |
| `photo_url` | text | YES | - | Check-in photo URL (Cloudinary) with watermark |

---

## attendance_automation_settings

**Purpose:** Configure automated attendance for users

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id` (nullable for global settings)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Settings ID |
| `user_id` | integer | YES | - | User ID (null = global settings) |
| `is_enabled` | boolean | NO | false | Enable/disable automation |
| `auto_check_in_time` | time without time zone | YES | - | Auto check-in time (HH:mm) |
| `auto_check_out_time` | time without time zone | YES | - | Auto check-out time (HH:mm) |
| `auto_break_start_time` | time without time zone | YES | - | Auto break start time (HH:mm) |
| `auto_break_duration` | integer | YES | 60 | Break duration in minutes |
| `default_work_location` | character varying(20) | YES | 'WFH' | WFH or Onsite |
| `work_days` | jsonb | YES | ["Monday", "Tuesday", ...] | Array of working days |
| `created_at` | timestamp with time zone | NO | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | NO | now() | Last update timestamp |

---

## attendance_edit_requests

**Purpose:** Employee requests to edit their attendance times (NEW)

**Primary Key:** `id`

**Foreign Keys:**
- `attendance_id` → `attendance.id`
- `user_id` → `users.id`
- `approver_id` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Request ID |
| `attendance_id` | integer | NO | - | Associated attendance record |
| `user_id` | integer | NO | - | Requesting employee |
| `original_check_in_time` | timestamp with time zone | YES | - | Original check-in (snapshot) |
| `original_check_out_time` | timestamp with time zone | YES | - | Original check-out (snapshot) |
| `original_break_start_time` | timestamp with time zone | YES | - | Original break start (snapshot) |
| `original_break_end_time` | timestamp with time zone | YES | - | Original break end (snapshot) |
| `requested_check_in_time` | timestamp with time zone | YES | - | Requested new check-in |
| `requested_check_out_time` | timestamp with time zone | YES | - | Requested new check-out |
| `requested_break_start_time` | timestamp with time zone | YES | - | Requested new break start |
| `requested_break_end_time` | timestamp with time zone | YES | - | Requested new break end |
| `reason` | text | NO | - | Reason for edit request |
| `status` | text | YES | 'pending' | pending, approved, rejected |
| `approver_id` | integer | YES | - | Admin who reviewed request |
| `approved_at` | timestamp with time zone | YES | - | Review timestamp |
| `comments` | text | YES | - | Approver comments |
| `created_at` | timestamp with time zone | YES | now() | Request creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |

---

## custom_backgrounds

**Purpose:** User-uploaded background images available to all users

**Primary Key:** `id` (UUID)

**Foreign Keys:**
- `uploaded_by` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Unique background ID |
| `name` | character varying(255) | NO | - | Background name/title |
| `file_path` | text | NO | - | Supabase storage path |
| `public_url` | text | NO | - | Public access URL |
| `uploaded_by` | integer | YES | - | User who uploaded (reference) |
| `uploaded_at` | timestamp with time zone | YES | now() | Upload timestamp |
| `is_active` | boolean | YES | true | Enable/disable background |
| `sort_order` | integer | YES | 0 | Display order |

---

## files

**Purpose:** File upload metadata and storage paths

**Primary Key:** `id` (UUID)

**Foreign Keys:**
- `uploaded_by` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Unique file ID |
| `name` | text | NO | - | Stored filename |
| `original_name` | text | NO | - | Original upload filename |
| `file_path` | text | NO | - | Supabase storage path |
| `size` | bigint | NO | - | File size in bytes |
| `mime_type` | text | NO | - | MIME type (e.g., image/png) |
| `category` | text | NO | - | File category (images, documents, etc.) |
| `uploaded_by` | integer | NO | - | User ID who uploaded |
| `public_url` | text | YES | - | Public access URL |
| `uploaded_at` | timestamp with time zone | YES | now() | Upload timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |

---

## lead_activities

**Purpose:** Activity log for leads (calls, emails, meetings, etc.)

**Primary Key:** `id` (text/UUID)

**Foreign Keys:**
- `lead_id` → `leads.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NO | - | Activity UUID |
| `lead_id` | text | NO | - | Associated lead ID |
| `employee_name` | text | NO | - | Employee who logged activity |
| `activity_type` | text | NO | - | call, email, meeting, site-visit, follow-up, remark, other |
| `activity_description` | text | NO | - | Activity details |
| `start_date` | date | YES | - | Activity start date |
| `end_date` | date | YES | - | Activity end date |
| `status_update` | text | YES | - | New status if changed |
| `created_at` | timestamp without time zone | NO | now() | Activity timestamp |

---

## leads

**Purpose:** CRM leads, events, and suppliers management

**Primary Key:** `id` (text/UUID)

**Foreign Keys:** None

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NO | - | Lead UUID |
| `category` | text | NO | - | lead, event, or supplier |
| `date_of_interaction` | date | YES | - | Date of interaction (for leads) *(NEW)* |
| `lead_type` | text | YES | - | Lead type classification *(NEW)* |
| `company_name` | text | YES | - | Company name (for leads) |
| `number_of_beneficiary` | text | YES | - | Number of beneficiaries *(NEW)* |
| `location` | text | YES | - | Location (for leads) |
| `lead_source` | text | YES | - | Where lead came from |
| `event_name` | text | YES | - | Event name (for events) |
| `event_type` | text | YES | - | Event type classification *(NEW)* |
| `venue` | text | YES | - | Event venue (for events) |
| `event_date` | date | YES | - | Event date (DEPRECATED - use event_start_date) |
| `event_start_date` | date | YES | - | Event start date *(NEW)* |
| `event_end_date` | date | YES | - | Event end date *(NEW)* |
| `event_time` | text | YES | - | Event time |
| `event_lead` | text | YES | - | Event lead person *(NEW)* |
| `number_of_attendees` | text | YES | - | Expected attendees |
| `event_report` | text | YES | - | Event report file path *(NEW)* |
| `supplier_name` | text | YES | - | Supplier name (for suppliers) |
| `supplier_location` | text | YES | - | Supplier location |
| `supplier_product` | text | YES | - | Supplier product/service |
| `price` | text | YES | - | Supplier price |
| `unit_type` | text | YES | - | Unit type (for pricing) |
| `contact_person` | text | YES | - | Contact person name |
| `mobile_number` | text | YES | - | Contact phone |
| `email_address` | text | YES | - | Contact email |
| `product` | text | YES | - | both, vending, or dispenser |
| `status` | text | YES | 'not-started' | Lead status |
| `remarks` | text | YES | - | Additional remarks |
| `disposition` | text | YES | - | Lead disposition status *(NEW)* |
| `assigned_to` | text | YES | - | Assigned employee name |
| `created_by` | text | NO | - | Creator employee name |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |
| `updated_at` | timestamp without time zone | NO | now() | Last update timestamp |

---

## leave_requests

**Purpose:** Employee leave request management

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`
- `approver_id` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Request ID |
| `user_id` | integer | NO | - | Requesting employee |
| `start_date` | date | NO | - | Leave start date |
| `end_date` | date | NO | - | Leave end date |
| `leave_type` | text | NO | - | vacation, sick, absent, offset |
| `reason` | text | YES | - | Leave reason |
| `status` | text | YES | 'pending' | pending, approved, rejected |
| `approver_id` | integer | YES | - | Approving manager ID |
| `approved_at` | timestamp with time zone | YES | - | Approval timestamp |
| `created_at` | timestamp with time zone | YES | now() | Request creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |

---

## migration_log

**Purpose:** Track database migration history

**Primary Key:** `id`

**Foreign Keys:** None

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Log entry ID |
| `migration_name` | character varying(255) | NO | - | Migration file name |
| `applied_at` | timestamp with time zone | YES | now() | When migration ran |
| `description` | text | YES | - | Migration description |
| `affected_records` | integer | YES | - | Number of records affected |

---

## notifications

**Purpose:** User notification system

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Notification ID |
| `user_id` | integer | NO | - | Recipient user ID |
| `type` | text | NO | - | leave_request, leave_approved, leave_rejected, attendance_alert, task_assigned, system_update |
| `title` | text | NO | - | Notification title |
| `message` | text | NO | - | Notification message |
| `data` | jsonb | YES | - | Additional metadata |
| `read_at` | timestamp with time zone | YES | - | When notification was read |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |

---

## permissions

**Purpose:** Define available system permissions

**Primary Key:** `id`

**Foreign Keys:** None

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Permission ID |
| `permission_key` | character varying(100) | NO | - | Unique permission key (e.g., can_approve_leaves) |
| `display_name` | character varying(255) | NO | - | Human-readable name |
| `description` | text | YES | - | Permission description |
| `category` | character varying(50) | YES | - | Permission category (tasks, attendance, etc.) |
| `is_active` | boolean | YES | true | Enable/disable permission |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |

---

## report_type_config

**Purpose:** Configure available report types

**Primary Key:** `id`

**Foreign Keys:** None

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Config ID |
| `type_key` | character varying(50) | NO | - | Unique report type key |
| `display_name` | character varying(100) | NO | - | Display name |
| `description` | text | YES | - | Type description |
| `filter_logic` | jsonb | YES | - | Filter configuration |
| `is_active` | boolean | YES | true | Enable/disable type |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |
| `updated_at` | timestamp without time zone | NO | now() | Last update timestamp |

---

## reports

**Purpose:** Legacy simple text reports (deprecated in favor of task_reports)

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Report ID |
| `user_id` | integer | NO | - | Reporting employee |
| `report_date` | date | NO | - | Report date |
| `report_type` | text | NO | - | Report type |
| `content` | text | NO | - | Report content (plain text) |
| `sent_to_whatsapp` | boolean | YES | false | WhatsApp send status |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |

---

## status_config

**Purpose:** Configure status options for various entities

**Primary Key:** `id`

**Foreign Keys:** None

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Status ID |
| `status_key` | character varying(50) | NO | - | Unique status key |
| `display_name` | character varying(100) | NO | - | Display name |
| `display_tag` | character varying(50) | YES | - | Short display tag |
| `color_class` | character varying(50) | YES | - | CSS color class |
| `sort_order` | integer | YES | 0 | Display order |
| `is_active` | boolean | YES | true | Enable/disable status |
| `entity_type` | character varying(50) | NO | - | Entity type (lead, task, etc.) |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |
| `updated_at` | timestamp without time zone | NO | now() | Last update timestamp |

---

## subtask_report_items

**Purpose:** Subtask items within task report items

**Primary Key:** `id` (UUID)

**Foreign Keys:**
- `report_item_id` → `task_report_items.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Subtask item ID |
| `report_item_id` | uuid | NO | - | Parent task report item |
| `subtask_id` | character varying(255) | NO | - | Original subtask ID |
| `subtask_title` | text | NO | - | Subtask title |
| `status` | character varying(50) | NO | - | Subtask status |
| `description` | text | YES | - | Subtask description |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |

---

## task_report_items

**Purpose:** Task items within a task report

**Primary Key:** `id` (UUID)

**Foreign Keys:**
- `report_id` → `task_reports.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Task item ID |
| `report_id` | uuid | NO | - | Parent report ID |
| `task_id` | uuid | NO | - | Original task ID |
| `task_title` | text | NO | - | Task title |
| `task_status` | character varying(50) | NO | - | Task status |
| `task_priority` | character varying(20) | YES | - | low, medium, high, urgent |
| `notes` | text | YES | - | Task notes |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |

---

## task_reports

**Purpose:** Structured daily task reports with WhatsApp integration

**Primary Key:** `id` (UUID)

**Foreign Keys:**
- `user_id` → `users.id`
- `report_type` → `report_type_config.type_key`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Report UUID |
| `user_id` | integer | NO | - | Reporting employee |
| `report_type` | character varying(50) | NO | - | start-of-day, end-of-day, weekly-summary |
| `report_date` | date | NO | - | Report date |
| `check_in_time` | timestamp without time zone | YES | - | Check-in time |
| `break_duration` | integer | YES | 0 | Break duration in seconds |
| `sent_at` | timestamp without time zone | YES | - | WhatsApp send timestamp |
| `sent_to` | character varying(255) | YES | - | WhatsApp recipient |
| `status` | character varying(20) | YES | 'draft' | draft, sent, failed |
| `whatsapp_sent` | boolean | YES | false | WhatsApp send status |
| `whatsapp_message_id` | text | YES | - | WhatsApp message ID |
| `created_at` | timestamp without time zone | NO | now() | Creation timestamp |
| `updated_at` | timestamp without time zone | NO | now() | Last update timestamp |

---

## tasks

**Purpose:** Task management and assignment

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`
- `assigned_by` → `users.id`
- `last_report_id` → `task_reports.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Task ID |
| `user_id` | integer | NO | - | Assigned employee |
| `assigned_by` | integer | YES | - | Assigning manager |
| `title` | text | NO | - | Task title |
| `description` | text | YES | - | Task description |
| `due_date` | date | YES | - | Task due date |
| `priority` | text | YES | 'medium' | low, medium, high, urgent |
| `status` | text | YES | 'pending' | pending, in_progress, completed, blocked, archived |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |
| `sub_tasks` | jsonb | YES | '[]' | Array of subtask objects (structure: `[{id, title, notes, completed}]`) |
| `updates` | jsonb | YES | '[]' | Array of task update/note objects (structure: `[{update_id, user_id, user_name, update_text, created_at}]`) |
| `last_reported_at` | timestamp without time zone | YES | - | Last report timestamp |
| `last_report_id` | uuid | YES | - | Last task report reference |

**Subtask Object Structure:**
```json
{
  "id": "temp-1234567890" | "uuid",
  "title": "Subtask title",
  "notes": "Details about what was done",
  "completed": false | true
}
```

**Usage:**
- `id`: Temporary ID (temp-timestamp) or UUID after save
- `title`: Short description of subtask
- `notes`: Optional details, used in check-out reports
- `completed`: Boolean status, toggled in check-out modal

**Update Object Structure:**
```json
{
  "update_id": "uuid",
  "user_id": 123,
  "user_name": "John Doe",
  "update_text": "Progress update or note",
  "created_at": "2025-01-13T10:00:00Z"
}
```

**Usage:**
- `update_id`: Unique UUID for the update
- `user_id`: ID of user who created the update
- `user_name`: Display name of user who created the update
- `update_text`: The update/note content
- `created_at`: ISO timestamp when update was created
- Updates are permanent and cannot be deleted (append-only log)

---

## user_permissions

**Purpose:** Junction table for user-permission assignments

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `users.id`
- `permission_id` → `permissions.id`
- `granted_by` → `users.id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | Assignment ID |
| `user_id` | integer | NO | - | User receiving permission |
| `permission_id` | integer | NO | - | Permission being granted |
| `granted_by` | integer | YES | - | Admin who granted permission |
| `granted_at` | timestamp with time zone | YES | now() | Grant timestamp |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |

---

## users

**Purpose:** User accounts and employee information

**Primary Key:** `id`

**Foreign Keys:**
- `manager_id` → `users.id` (self-referencing)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | nextval('...') | User ID |
| `email` | text | NO | - | Login email (unique) |
| `password_hash` | text | NO | - | Hashed password |
| `name` | text | NO | - | Full name |
| `role` | text | YES | 'employee' | admin, manager, employee, intern |
| `department` | text | YES | - | Department name |
| `hire_date` | date | YES | CURRENT_DATE | Employment start date |
| `status` | text | YES | 'active' | active, inactive |
| `created_at` | timestamp with time zone | YES | now() | Account creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update timestamp |
| `employee_name` | text | YES | - | Alternative employee name |
| `manager_id` | integer | YES | - | Reporting manager user ID |
| `position` | text | YES | - | Job position/title |
| `employee_id` | text | YES | - | Employee ID (unique, can be used for login) |
| `avatar` | text | YES | - | Avatar URL |
| `last_password_change` | timestamp with time zone | YES | - | Last password change date |
| `force_password_reset` | boolean | YES | false | Require password reset on next login |
| `password_expires_at` | timestamp with time zone | YES | - | Password expiration date |
| `password_expiry_days` | integer | YES | - | Days until password expires |
| `last_password_reset_warning` | timestamp with time zone | YES | - | Last warning sent timestamp |
| `preferences` | jsonb | YES | '{}' | User preferences (background, theme, etc.) |

---

## Common Patterns

### Timestamps
- Most tables use `timestamp with time zone` for timestamps
- Default value is typically `now()`
- Common timestamp columns: `created_at`, `updated_at`

### ID Columns
- Integer IDs use sequences: `nextval('table_name_id_seq'::regclass)`
- UUID IDs use: `gen_random_uuid()` or `uuid_generate_v4()`

### JSONB Columns
- `attendance.sessions` - Array of check-in/out sessions
- `tasks.sub_tasks` - Array of subtask objects
- `attendance_automation_settings.work_days` - Array of weekday names
- `notifications.data` - Additional metadata
- `report_type_config.filter_logic` - Filter configuration
- `users.preferences` - User preferences (tasksBoardBackground, theme, etc.)

### Text Columns Without Length Limits
- PostgreSQL `text` type is used for variable-length strings
- No character limit constraints
- Used for: names, descriptions, notes, remarks, etc.

### Status Enums (stored as text)
Common status values across tables:
- **Attendance:** present, absent, late, early-leave, holiday, leave, on_duty
- **Attendance Edit Requests:** pending, approved, rejected *(NEW)*
- **Announcements:** priority (urgent, high, normal, low), target_audience (all, managers, employees) *(NEW)*
- **Leave Requests:** pending, approved, rejected, cancelled
- **Tasks:** pending, in_progress, completed, blocked, archived, cancel
- **Subtasks:** pending, in_progress, completed, cancel
- **Users:** active, inactive
- **Leads:** not-started, contacted, qualified, closed-deal, lost
- **Reports:** draft, sent, failed

---

## Recent Changes (v5.3 - January 2026)

### New Tables Added:
1. **announcements** - System-wide announcements for employees
2. **attendance_edit_requests** - Employee requests to edit attendance times

### New Lead Fields:
- `date_of_interaction` - Date of interaction for leads
- `lead_type` - Lead type classification
- `number_of_beneficiary` - Number of beneficiaries
- `disposition` - Lead disposition status
- `event_type` - Event type classification
- `event_start_date` / `event_end_date` - Event date range
- `event_lead` - Event lead person
- `event_report` - Event report file path

---

**End of Database Fields Reference**
