# GoWater HR - Reusable Functions, Services & Fields Reference

## 📖 Overview
This document contains all reusable functions, services, fields, types, and APIs in the GoWater HR codebase to avoid naming conflicts and ensure consistency.

> **Last Updated:** 2026-01-28
> **Recent Changes:** Migrated to Turborepo monorepo structure

---

## 🏗️ Monorepo Structure

```
gowater-monorepo/
├── apps/
│   ├── web/                 # Next.js web app (all paths below are relative to this)
│   │   └── src/
│   │       ├── lib/         # Services (auth.ts, attendance.ts, leads.ts, etc.)
│   │       ├── types/       # TypeScript types
│   │       ├── hooks/       # React hooks
│   │       ├── contexts/    # React contexts
│   │       └── app/         # Next.js app router pages
│   └── mobile/              # React Native Expo app
│       └── src/
│           ├── contexts/    # Auth context
│           └── services/    # API service wrappers (attendance.ts, tasks.ts, photoCapture.ts)
├── packages/
│   └── types/               # Shared TypeScript types (@gowater/types)
│       └── src/
│           ├── attendance.ts
│           ├── auth.ts
│           └── leads.ts
└── docs/                    # This documentation
```

**Import Paths:**
- Web app internal: `@/lib/...`, `@/types/...` (unchanged)
- Shared types: `import { User } from '@gowater/types'`
- Mobile app: Uses same API endpoints as web

---

## 🗃️ Database Schema

### Tables & Fields
```sql
-- users
id, email, password_hash, name, employee_name, employee_id, role, position, department, manager_id, avatar, hire_date, status, last_password_change, password_expires_at, password_expiry_days, force_password_reset, created_at, updated_at

-- permissions (Granular permission system)
id, permission_key, display_name, description, category, is_active, created_at, updated_at

-- user_permissions (Junction table for user-permission assignments)
id, user_id, permission_id, granted_at, granted_by

-- attendance
id, user_id, date, check_in_time, check_out_time, break_start_time, break_end_time, break_duration, total_hours, status, work_location, sessions, notes, photo_url, created_at, updated_at

-- attendance_automation_settings (Automated attendance scheduling)
id, user_id, is_enabled, auto_check_in_time, auto_check_out_time, auto_break_start_time, auto_break_duration, default_work_location, work_days, created_at, updated_at

-- attendance_edit_requests (NEW v5.3 - Time edit request workflow)
id, attendance_id, user_id, original_check_in_time, original_check_out_time, original_break_start_time, original_break_end_time, requested_check_in_time, requested_check_out_time, requested_break_start_time, requested_break_end_time, reason, status, approver_id, approved_at, comments, created_at, updated_at

-- announcements (NEW v5.3 - System-wide announcements)
id, title, content, priority, created_by, created_at, updated_at, expires_at, is_active, target_audience

-- tasks
id, user_id, assigned_by, title, description, due_date, priority, status, sub_tasks, created_at, updated_at

-- leave_requests
id, user_id, start_date, end_date, leave_type, reason, status, approver_id, approved_at, created_at, updated_at

-- reports
id, user_id, report_date, report_type, content, sent_to_whatsapp, created_at

-- files
id, name, original_name, file_path, size, mime_type, category, uploaded_by, public_url, uploaded_at, updated_at

-- leads (supports leads, events, and suppliers with different fields)
id, category, date_of_interaction, lead_type, company_name, number_of_beneficiary, location, lead_source, event_name, event_type, venue, event_date, event_start_date, event_end_date, event_time, event_lead, number_of_attendees, event_report, supplier_name, supplier_location, supplier_product, price, unit_type, contact_person, mobile_number, email_address, product, status, remarks, disposition, assigned_to, created_by, created_at, updated_at

-- lead_activities (KEY TABLE for tracking WHO did WHAT)
id, lead_id, employee_name, activity_type, activity_description, start_date, end_date, status_update, created_at

-- notifications (NEW - Global notification system)
id, user_id, type, title, message, data, read_at, created_at

-- status_config (NEW - Centralized status configuration)
id, status_key, display_name, display_tag, color_class, sort_order, is_active, entity_type, created_at, updated_at

-- report_type_config (NEW - Dynamic report type definitions)
id, type_key, display_name, description, filter_logic, is_active, created_at, updated_at

-- task_reports (NEW - Task report snapshots)
id, user_id, report_type, report_date, check_in_time, break_duration, sent_at, sent_to, status, whatsapp_sent, whatsapp_message_id, created_at, updated_at

-- task_report_items (NEW - Tasks in reports)
id, report_id, task_id, task_title, task_status, task_priority, notes, created_at

-- subtask_report_items (NEW - Subtasks in reports)
id, report_item_id, subtask_id, subtask_title, status, description, created_at
```

### Enum Values
```sql
-- User roles (boss role removed - use permissions system instead)
role: 'admin', 'employee', 'manager', 'intern'

-- User status
status: 'active', 'inactive'

-- Permission keys (Granular permission system)
permission_key: 'can_view_analytics', 'can_view_activity_monitor', 'can_manage_leads', 'can_export_reports', 'can_manage_team', 'can_assign_tasks', 'can_approve_leave', 'can_manage_users'

-- Task status
status: 'pending', 'in_progress', 'completed', 'blocked', 'archived'

-- Task priority
priority: 'low', 'medium', 'high', 'urgent'

-- Attendance status
status: 'present', 'absent', 'late', 'on_duty', 'leave'

-- Attendance edit request status (NEW v5.3)
status: 'pending', 'approved', 'rejected'

-- Work location
work_location: 'WFH', 'Onsite'

-- Announcement priority (NEW v5.3)
priority: 'urgent', 'high', 'normal', 'low'

-- Announcement target audience (NEW v5.3)
target_audience: 'all', 'managers', 'employees'

-- Leave types
leave_type: 'vacation', 'sick', 'absent', 'offset'

-- Leave status
status: 'pending', 'approved', 'rejected', 'cancelled'

-- File categories
category: 'documents', 'images', 'videos', 'presentations', 'spreadsheets', 'archives'

-- Lead categories (3 main categories: leads, events, and suppliers)
category: 'lead', 'event', 'supplier'

-- Lead product types
product: 'both', 'vending', 'dispenser'

-- Lead status
status: 'not-started', 'contacted', 'quoted', 'negotiating', 'closed-deal', 'rejected'

-- Notification types
type: 'leave_request', 'leave_approved', 'leave_rejected', 'attendance_alert', 'task_assigned', 'system_update'

-- Activity types (for leads and events)
activity_type: 'call', 'email', 'meeting', 'site-visit', 'follow-up', 'remark', 'other'

-- Supplier-specific activity types
activity_type: 'active-supplier', 'recording', 'checking'
```

## 🔧 Services & Classes

### AuthService (`src/lib/auth.ts`)
**Functions:**
- `initialize()` - Initialize database and create default admin
- `login(username, password)` - User login (username can be email or employee_id), returns user with password expiry info
- `createUser(userData, createdBy)` - Create new user
- `verifyToken(token)` - Verify JWT token and return user with permissions
- `getAllUsers()` - Get all active users
- `updateUserStatus(userId, status)` - Update user status
- `deleteUser(userId)` - Soft delete user (sets inactive and modifies email to allow reuse)
- `updateUserProfile(userId, profileData)` - Update user profile (supports name, department, employeeName, role, position, avatar, employeeId)
- `changePassword(userId, currentPassword, newPassword)` - Change user password with validation

**Password Expiry Fields:**
- `password_expires_at` - Timestamp when password expires (admin users only, 30 days)
- `password_expiry_days` - Number of days until password expires (default: 30 for admins)
- `last_password_change` - Timestamp of last password change
- `force_password_reset` - Boolean to force user to reset password on next login

**Singleton Access:** `getAuthService()`

### PermissionsService (`src/lib/permissions.ts`)
**Functions:**
- `hasPermission(userId, permissionKey)` - Check if user has a specific permission (admins always return true)
- `hasAnyPermission(userId, permissionKeys)` - Check if user has any of the specified permissions
- `hasAllPermissions(userId, permissionKeys)` - Check if user has all specified permissions
- `getUserPermissions(userId)` - Get all permissions for a user
- `getAllPermissions()` - Get all available permissions in the system
- `grantPermission(userId, permissionKey, grantedBy)` - Grant a single permission to a user
- `revokePermission(userId, permissionKey)` - Revoke a single permission from a user
- `updateUserPermissions(userId, permissionKeys, grantedBy)` - Bulk update user permissions (replaces all existing)
- `grantDefaultPermissions(userId, role)` - Grant default permissions based on user role

**Default Permissions by Role:**
- **Admin**: All permissions (automatic)
- **Manager**: can_view_analytics, can_view_activity_monitor, can_manage_team, can_assign_tasks, can_approve_leave
- **Employee**: No default permissions (can be granted individually)

**Permission Categories:**
- Analytics: can_view_analytics
- Activity Monitoring: can_view_activity_monitor
- Lead Management: can_manage_leads
- Reporting: can_export_reports
- Team Management: can_manage_team, can_assign_tasks
- Leave Management: can_approve_leave
- User Management: can_manage_users (admin only by default)

**Singleton Access:** `getPermissionsService()`

### SupabaseDatabase (`src/lib/supabase.ts`)
**Functions:**
- `initialize()` - Initialize database connection
- `get<T>(table, conditions)` - Get single record
- `all<T>(table, conditions, orderBy)` - Get multiple records
- `insert(table, data)` - Insert record
- `update(table, data, conditions)` - Update record
- `delete(table, conditions)` - Delete record
- `executeRawSQL<T>(sql, params)` - Execute raw SQL

**Singleton Access:** `getDb()`

### AttendanceService (`src/lib/attendance.ts`)
**Functions:**
- `checkIn(userId, notes, workLocation)` - Check in user with work location
- `checkOut(userId, notes)` - Check out user
- `getTodayAttendance(userId)` - Get today's attendance
- `getWeeklyAttendance(userId, startDate)` - Get weekly attendance
- `getAttendanceSummary(userId, startDate, endDate)` - Get attendance summary
- `deleteTodayAttendance(userId)` - Delete today's attendance
- `startBreak(userId)` - Start break
- `endBreak(userId)` - End break
- `getAllUsersAttendance(filters)` - Get all users' attendance with filters (admin only)
- `bulkUpdateAttendance(operation)` - Bulk update/delete attendance records (admin only)
- `deleteAttendanceRecord(attendanceId, adminId)` - Delete specific attendance record (admin only)

**Singleton Access:** `getAttendanceService()`

### AttendanceAutomationService (`src/lib/attendanceAutomation.ts`)
**Functions:**
- `getAutomationSettings(userId?)` - Get automation settings for user or global
- `getEffectiveSettings(userId)` - Get effective settings (user-specific or falls back to global)
- `updateAutomationSettings(userId, settings)` - Update automation settings
- `enableAutomation(userId, enabled)` - Enable/disable automation for user
- `deleteAutomationSettings(userId)` - Delete user-specific settings (revert to global)
- `getEnabledAutomations()` - Get all users with automation enabled
- `processAutomatedAttendance(currentTime)` - Execute automated attendance (called by cron)
- `applyGlobalSettingsToUser(userId)` - Apply global settings to specific user
- `applyGlobalSettingsToAllUsers()` - Apply global settings to all users (bulk operation)

**Singleton Access:** `getAttendanceAutomationService()`

### WhatsAppService (`src/lib/whatsapp.ts`)
**Functions:**
- `initialize(handlers)` - Initialize WhatsApp client
- `sendMessage(messageData)` - Send single message
- `sendBulkMessage(recipients, message, type)` - Send bulk messages
- `getChats()` - Get all chats
- `getContacts()` - Get contacts
- `disconnect()` - Disconnect client
- `getClientInfo()` - Get client info
- `isClientReady()` - Check if ready
- `getCurrentQRCode()` - Get QR code

**Instance Access:** `whatsappService` (exported singleton)

### FileService (`src/lib/files.ts`)
**Static Functions:**
- `uploadFile(file, userId, customCategory)` - Upload file
- `getUserFiles(userId, category)` - Get user files
- `getAllFiles(category)` - Get all files
- `deleteFile(fileId, userId)` - Delete file
- `getFileDownloadUrl(filePath)` - Get download URL
- `validateFile(file)` - Validate file
- `categorizeFile(fileName, mimeType)` - Categorize file

### LeadService (`src/lib/leads.ts`)
**Functions:**
- `createLead(employeeName, leadData)` - Create new lead
- `getLeadsByCategory(category)` - Get leads by category
- `getAllLeads()` - Get all leads
- `getLeadById(leadId)` - Get single lead
- `updateLead(leadId, updates)` - Update lead
- `deleteLead(leadId)` - Delete lead
- `logActivity(leadId, employeeName, activityData)` - **KEY FUNCTION** - Log employee activity
- `getActivitiesForLead(leadId)` - Get all activities for a lead
- `getAllActivities()` - Get all activities
- `deleteActivity(activityId)` - Delete activity
- `getLeadsWithActivities(category?)` - Get leads with their activities
- `getDashboardStats()` - Get boss dashboard statistics

**Singleton Access:** `getLeadService()`

### LeaveService (`src/lib/leave.ts`)
**Functions:**
- `createLeaveRequest(data)` - Create new leave request with validation
- `getLeaveRequests(userId)` - Get user's leave requests
- `getTeamLeaveRequests(managerId, status?)` - Get team leave requests for manager
- `approveLeaveRequest(leaveRequestId, approverId, comments?)` - Approve leave request
- `rejectLeaveRequest(leaveRequestId, approverId, comments)` - Reject leave request
- `getLeaveBalance(userId)` - Get user's leave balance for current year
- `deleteLeaveRequest(leaveRequestId, userId)` - Delete pending leave request
- `markAttendanceAsLeave(userId, startDate, endDate)` - Mark attendance records as leave (private)

**Singleton Access:** `getLeaveService()`

### NotificationService (`src/lib/notifications.ts`)
**Functions:**
- `createNotification(data)` - Create new notification
- `getUserNotifications(userId, unreadOnly?)` - Get user notifications
- `markAsRead(notificationId, userId)` - Mark single notification as read
- `markAllAsRead(userId)` - Mark all user notifications as read
- `getUnreadCount(userId)` - Get count of unread notifications
- `deleteNotification(notificationId, userId)` - Delete notification

**Singleton Access:** `getNotificationService()`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change user password

### Users & Admin
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PATCH /api/admin/users/[userId]` - Update user (admin only)
- `DELETE /api/admin/users/[userId]` - Delete user (admin only)

### Permissions (NEW - Granular Permission System)
- `GET /api/admin/permissions` - Get all available permissions or user-specific permissions (query: ?userId=123)
- `POST /api/admin/permissions` - Grant a permission to a user (admin only)
- `PUT /api/admin/permissions` - Update all permissions for a user (bulk update, admin only)
- `DELETE /api/admin/permissions` - Revoke a permission from a user (admin only)

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile (supports name, department, employeeName, position, avatar, employeeId)

### Tasks
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks` - Update task
- `DELETE /api/tasks` - Delete task

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Check in/out with work location support
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/weekly` - Get weekly attendance
- `POST /api/attendance/checkin` - Check in (supports admin userId override with can_manage_attendance permission)
- `POST /api/attendance/checkout` - Check out (supports admin userId override with can_manage_attendance permission)
- `POST /api/attendance/break/start` - Start break (supports admin userId override with can_manage_attendance permission)
- `POST /api/attendance/break/end` - End break (supports admin userId override with can_manage_attendance permission)
- `GET /api/attendance/summary` - Get attendance summary with date range

### Attendance Management (Admin)
- `GET /api/admin/attendance` - Get all users' attendance with filters and pagination (admin only)
- `POST /api/admin/attendance` - Bulk operations (update/delete) on attendance records (admin only)
- `DELETE /api/admin/attendance` - Delete specific attendance record (admin only, query: ?attendanceId=123)
- `GET /api/admin/attendance/export` - Export attendance data as CSV (admin only, query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&userId=123)

### Attendance Automation (Admin)
- `GET /api/admin/attendance/automation` - Get automation settings (query: ?userId=123 or ?userId=123&effective=true for effective settings)
- `POST /api/admin/attendance/automation` - Create/update automation settings (body: { userId, settings })
- `PATCH /api/admin/attendance/automation` - Enable/disable automation (body: { userId, enabled })
- `DELETE /api/admin/attendance/automation` - Delete user-specific automation settings (query: ?userId=123)
- `PUT /api/admin/attendance/automation` - Apply global settings to user(s) (body: { userId } or {} for all)

### Cron Jobs
- `POST /api/cron/attendance-automation` - Execute automated attendance (secured with CRON_SECRET)
- `GET /api/cron/attendance-automation` - Health check endpoint

### Leave Management
- `GET /api/leave` - Get user leave requests
- `POST /api/leave` - Create leave request or delete (supports DELETE via query param)
- `POST /api/leave/approve` - Approve or reject leave request
- `GET /api/leave/balance` - Get user leave balance
- `GET /api/leave/team` - Get team leave requests (manager only)

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Mark notification as read
- `GET /api/notifications/count` - Get unread notification count

### Team Management
- `GET /api/team/members` - Get team members (manager only)

### Files
- `GET /api/files` - Get files
- `POST /api/files` - Upload file
- `DELETE /api/files` - Delete file
- `GET /api/files/download` - Download file

### WhatsApp
- `POST /api/whatsapp/initialize` - Initialize WhatsApp
- `GET /api/whatsapp/status` - Get WhatsApp status
- `POST /api/whatsapp/send` - Send WhatsApp message
- `POST /api/whatsapp/disconnect` - Disconnect WhatsApp
- `GET /api/whatsapp/contacts` - Get WhatsApp contacts

### Configuration (NEW - Dynamic Configuration System)
- `GET /api/config/statuses` - Get status configurations (filter by entity_type)
- `POST /api/config/statuses` - Create status configuration (admin only)
- `PUT /api/config/statuses` - Update status configuration (admin only)
- `DELETE /api/config/statuses` - Delete status configuration (admin only)
- `GET /api/config/report-types` - Get report type configurations
- `POST /api/config/report-types` - Create report type configuration (admin only)
- `PUT /api/config/report-types` - Update report type configuration (admin only)
- `DELETE /api/config/report-types` - Delete report type configuration (admin only)

### Task Reports (NEW - Enhanced Report System)
- `POST /api/reports` - Create task report with tasks and subtasks
- `GET /api/reports` - Get user task reports (filter by type, date range, status)
- `PUT /api/reports` - Update draft report
- `DELETE /api/reports` - Delete draft report

### Legacy Reports
- `GET /api/reports/attendance` - Get attendance reports with date range
- `GET /api/reports/tasks` - Get tasks reports with date range
- `GET /api/reports/leaves` - Get leave requests reports with date range

### Leads
- `GET /api/leads?category=factory` - Get leads by category (or all if no category)
- `POST /api/leads` - Create new lead
- `PUT /api/leads` - Update lead
- `DELETE /api/leads?id=123` - Delete lead

### Lead Activities
- `POST /api/leads/activities` - **KEY ENDPOINT** - Log employee activity
- `GET /api/leads/activities?leadId=123` - Get activities for a lead
- `DELETE /api/leads/activities?id=456` - Delete activity

### Lead Dashboard
- `GET /api/leads/dashboard` - Get dashboard stats (requires 'can_view_analytics' permission)

### Database
- `POST /api/init-db` - Initialize database
- `GET /api/init-db` - Get database status

## 📋 TypeScript Types & Interfaces

### Core Types (`src/types/auth.ts`)
```typescript
interface User {
  id: number;
  email: string;
  name: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager' | 'intern';
  position?: string;
  department?: string;
  employeeName?: string;
  avatar?: string;
  force_password_reset?: boolean;
  last_password_change?: string;
  password_expires_at?: string;
  password_expiry_days?: number;
  permissions?: UserPermission[];
}

interface AuthUser {
  id: number;
  email: string;
  name: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager' | 'intern';
  position?: string;
  department?: string;
  employeeName?: string;
  avatar?: string;
  force_password_reset?: boolean;
  last_password_change?: string;
  password_expires_at?: string;
  password_expiry_days?: number;
}

interface Permission {
  id: number;
  permission_key: string;
  display_name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  permission_key: string;
  display_name: string;
  category?: string;
  granted_at: string;
  granted_by?: number;
}

interface LoginCredentials {
  username: string; // Can be email or employee_id
  password: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  employeeId?: string;
  role?: 'admin' | 'employee' | 'manager';
  position?: string;
  department?: string;
  employeeName?: string;
}

interface LeaveRequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  leave_type: 'vacation' | 'sick' | 'absent' | 'offset';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: number;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface LeaveRequestWithDetails extends LeaveRequest {
  employee_name: string;
  employee_email: string;
  employee_department: string;
  approver_name?: string;
  approver_email?: string;
  total_days: number;
}

interface LeaveBalance {
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  personal: { used: number; total: number };
  maternity: { used: number; total: number };
  paternity: { used: number; total: number };
  unpaid: { used: number; total: number };
}

interface Notification {
  id: number;
  user_id: number;
  type: 'leave_request' | 'leave_approved' | 'leave_rejected' | 'attendance_alert' | 'task_assigned' | 'system_update';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at?: Date;
  created_at: Date;
}

interface CreateNotificationData {
  user_id: number;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
```

### Attendance Types (`src/types/attendance.ts`)
```typescript
// =====================================================
// ATTENDANCE AUTOMATION TYPES (NEW)
// =====================================================

interface AttendanceAutomationSettings {
  id: number;
  userId: number | null; // null for global settings
  isEnabled: boolean;
  autoCheckInTime: string | null; // HH:mm format (e.g., "09:00")
  autoCheckOutTime: string | null; // HH:mm format (e.g., "18:00")
  autoBreakStartTime: string | null; // HH:mm format (e.g., "12:00")
  autoBreakDuration: number; // minutes
  defaultWorkLocation: 'WFH' | 'Onsite';
  workDays: string[]; // ['Monday', 'Tuesday', ...]
  createdAt: Date;
  updatedAt: Date;
}

interface AttendanceAutomationFormData {
  isEnabled: boolean;
  autoCheckInTime: string;
  autoCheckOutTime: string;
  autoBreakStartTime: string;
  autoBreakDuration: number;
  defaultWorkLocation: 'WFH' | 'Onsite';
  workDays: string[];
}

interface AttendanceManagementFilters {
  userId?: number;
  startDate?: string;
  endDate?: string;
  status?: 'present' | 'absent' | 'late' | 'on_duty' | 'leave';
  workLocation?: 'WFH' | 'Onsite';
  page?: number;
  limit?: number;
}

interface AttendanceRecordWithUser {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userDepartment: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDuration?: number;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'on_duty' | 'leave';
  workLocation?: 'WFH' | 'Onsite';
  notes?: string;
  isAutomated?: boolean; // whether this was created by automation
}

interface BulkAttendanceOperation {
  type: 'update' | 'delete';
  attendanceIds: number[];
  updates?: Partial<{
    status: 'present' | 'absent' | 'late' | 'on_duty' | 'leave';
    workLocation: 'WFH' | 'Onsite';
    notes: string;
  }>;
}

interface AttendanceManagementResponse {
  records: AttendanceRecordWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AutomationExecutionResult {
  success: boolean;
  userId: number;
  action: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  timestamp: Date;
  error?: string;
}

interface AutomationLog {
  id: number;
  userId: number;
  action: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  scheduledTime: string;
  executedTime: Date;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  createdAt: Date;
}

// =====================================================
// EXISTING ATTENDANCE TYPES
// =====================================================

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number; // seconds
  isTimerRunning: boolean;
  estimatedHours?: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: Date;
  clockOut?: Date;
  breaks: BreakRecord[];
  totalWorkHours: number;
  totalBreakHours: number;
  status: 'present' | 'absent' | 'late' | 'early-leave' | 'holiday' | 'leave';
  workLocation?: 'WFH' | 'Onsite';
  location?: string;
  tasks: Task[];
  notes?: string;
  regularizationRequest?: RegularizationRequest;
  isHoliday: boolean;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LeaveRequest {
  id: string;
  userId: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  halfDay: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  attachments: string[];
  emergencyContact?: string;
}

interface WhatsAppReport {
  id: string;
  userId: string;
  type: 'start-report' | 'eod-report' | 'weekly-summary' | 'leave-notification' | 'supervisor-summary';
  content: string;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  recipients: string[];
  metadata?: {
    attendanceId?: string;
    leaveRequestId?: string;
    tasks?: Task[];
    workHours?: number;
    breakHours?: number;
  };
}

interface AttendanceReport {
  date: string;
  timeIn: string;
  timeOut: string;
  workHours: string;
  breakTime: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  overtime: string;
  workLocation: string;
}

interface TaskReport {
  taskName: string;
  project: string;
  assignee: string;
  status: string;
  priority: string;
  timeSpent: string;
  dueDate: string;
  completionDate: string;
}

interface LeaveReport {
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
}
```

### Lead Types (`src/types/leads.ts`)
```typescript
type LeadCategory = 'lead' | 'event' | 'supplier';
type ProductType = 'both' | 'vending' | 'dispenser';
type ActivityType = 'call' | 'email' | 'meeting' | 'site-visit' | 'follow-up' | 'remark' | 'other' | 'active-supplier' | 'recording' | 'checking';

interface Lead {
  id: string;
  category: LeadCategory;

  // LEAD-SPECIFIC FIELDS (used when category = 'lead')
  company_name: string | null;
  location: string | null;
  lead_source: string | null;
  type_of_business: string | null;
  number_of_employees: string | null;

  // EVENT-SPECIFIC FIELDS (used when category = 'event')
  event_name: string | null;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  number_of_attendees: string | null;

  // SUPPLIER-SPECIFIC FIELDS (used when category = 'supplier')
  supplier_name: string | null;
  supplier_location: string | null;
  supplier_capacity: string | null;
  supplier_specialization: string | null;

  // SHARED FIELDS (used by all categories)
  contact_person: string | null;
  mobile_number: string | null;
  email_address: string | null;
  product: ProductType | null;
  status: string;
  remarks: string | null;
  next_action: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface LeadActivity {
  id: string;
  lead_id: string;
  employee_name: string; // WHO did this
  activity_type: ActivityType; // WHAT they did
  activity_description: string;
  start_date?: string;
  end_date?: string;
  status_update?: string;
  created_at: string;
}

interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
  activity_count: number;
  last_activity?: LeadActivity;
}

interface LeadFormData {
  category: LeadCategory;

  // LEAD-SPECIFIC FIELDS
  company_name?: string;
  location?: string;
  lead_source?: string;
  type_of_business?: string;
  number_of_employees?: string;

  // EVENT-SPECIFIC FIELDS
  event_name?: string;
  venue?: string;
  event_date?: string;
  event_time?: string;
  number_of_attendees?: string;

  // SUPPLIER-SPECIFIC FIELDS
  supplier_name?: string;
  supplier_location?: string;
  supplier_capacity?: string;
  supplier_specialization?: string;

  // SHARED FIELDS
  contact_person?: string;
  mobile_number?: string;
  email_address?: string;
  product?: ProductType;
  status?: string;
  remarks?: string;
  next_action?: string;
  assigned_to?: string;
}

interface ActivityFormData {
  activity_type: ActivityType;
  activity_description: string;
  start_date?: string;
  end_date?: string;
  status_update?: string;
}

interface DashboardStats {
  total_leads: number;
  active_leads: number;
  total_activities: number;
  activities_today: number;
  closed_deals: number;
  by_category: {
    category: LeadCategory;
    count: number;
    percentage: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  employee_activities: {
    employee_name: string;
    total_activities: number;
    calls: number;
    emails: number;
    meetings: number;
    site_visits: number;
    leads_assigned: number;
  }[];
  recent_activities: (LeadActivity & { company_name: string; category: LeadCategory })[];
  stale_leads: LeadWithActivities[];
}
```

### Configuration System Types (NEW - Dynamic Configuration)
```typescript
interface StatusConfig {
  id: number;
  status_key: string;
  display_name: string;
  display_tag: string | null;
  color_class: string | null;
  sort_order: number;
  is_active: boolean;
  entity_type: string;
  created_at: string;
  updated_at: string;
}

interface ReportTypeConfig {
  id: number;
  type_key: string;
  display_name: string;
  description: string | null;
  filter_logic: {
    include_statuses?: string[];
    exclude_statuses?: string[];
  } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskReport {
  id: string;
  user_id: number;
  report_type: string;
  report_date: string;
  check_in_time: string | null;
  break_duration: number;
  sent_at: string | null;
  sent_to: string | null;
  status: 'draft' | 'sent';
  whatsapp_sent: boolean;
  whatsapp_message_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskReportItem {
  id: string;
  report_id: string;
  task_id: string;
  task_title: string;
  task_status: string;
  task_priority: string | null;
  notes: string | null;
  created_at: string;
}

interface SubtaskReportItem {
  id: string;
  report_item_id: string;
  subtask_id: string;
  subtask_title: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface TaskReportWithCounts extends TaskReport {
  task_count: number;
  subtask_count: number;
}
```

## 🎣 React Hooks

### useAuth Hook (`src/hooks/useAuth.ts`)
```typescript
export function useAuth() {
  // Returns: { user, isLoading, error, login, logout }
}
```

## 🧩 React Components

### Core Components
- `Sidebar({ user, isCollapsed, onToggle })` - Navigation sidebar
- `Header({ user, onToggleSidebar, onLogout })` - Page header
- `TaskCard({ task, onStatusChange, onDeleteTask, getPriorityColor })` - Task display card
- `WhatsAppConnection` - WhatsApp connection management

### Page Components
- `Reports` - Full reports and analytics page with Excel export
- `SettingsPage` - User settings with profile, notifications, appearance, security tabs

### Lead Components
- `AddLeadModal({ category, onClose, onSuccess })` - Modal to create new lead, event, or supplier (shows different form based on category)
- `LeadTypeSelectionModal({ onClose, onSelect })` - Modal to select category (lead, event, or supplier)
- `LogActivityModal({ lead, onClose, onSuccess })` - **KEY COMPONENT** - Modal to log employee activity (shows different activity types based on category)
- `ViewActivitiesModal({ lead, onClose })` - Modal to view activity timeline for a lead

### Admin Components
- `UserPermissionsModal({ userId, userName, userRole, onClose, onSuccess })` - Modal to manage user permissions with checkbox-based UI grouped by category

### Task Components
- `TaskTimelineView` - Timeline view for tasks with dates and archived status
- `BreakModal` - Modal for break time management

### Lead Pages (Task Assigned Section)
- `/dashboard/task-assigned` - Main page with 3 category tabs: Leads, Events, and Suppliers (formerly /dashboard/leads)
- `/dashboard/task-assigned/analytics` - Activity dashboard with employee leaderboard and stats (requires 'can_view_analytics' permission)
- `/dashboard/task-assigned/activity-monitor` - Real-time activity monitoring (requires 'can_view_activity_monitor' permission)

## 🔄 Common Functions (Dashboard)

### Task Management Functions
```typescript
// From src/app/dashboard/page.tsx
fetchTasks() - Fetch user tasks
updateTaskStatus(id, status) - Update task status
deleteTask(id) - Delete task
addTask() - Create new task with subtasks support
handleCreateTask() - Create task during check-in
handleOpenEditTask(task) - Open edit form for existing task
handleUpdateTask() - Update task with subtasks
archiveCompletedTasks() - Archive completed tasks
getPriorityColor(priority) - Get CSS classes for priority
saveSubTaskUpdates() - Save subtask completion status and notes before check-out
```

### Subtask Structure
```typescript
interface SubTask {
  id: string;              // temp-{timestamp} or UUID
  title: string;           // Subtask title
  notes: string;           // Details/notes (used in check-out)
  completed: boolean;      // Completion status
}
```

### Attendance Functions
```typescript
confirmTimeIn() - Confirm time in
confirmTimeOut() - Confirm time out with task archiving and subtask updates
startBreak() - Start break
endBreak() - End break
sendStartReport() - Send WhatsApp start report with tasks and subtasks
sendEndOfDayReport() - Send WhatsApp EOD report with subtask status and notes
fetchCheckInTasks() - Fetch active tasks (pending/in_progress/blocked only)
fetchCheckOutTasks() - Fetch active tasks for status updates (excludes completed)
```

### WhatsApp Report Format (Updated)
```
Check-In Report:
Today's Planned Tasks:
1. Task Title [STATUS]
   [ ] Subtask 1
   [x] Subtask 2

Check-Out Report:
Today's Task Updates:
1. Task Title [STATUS]
   [x] Subtask 1
   [Done.. Details about completion]
   [ ] Subtask 2
   [Still pending]

Checkbox Format:
- [ ] = Pending (unchecked)
- [x] = Completed (checked)
- Notes appear in brackets below subtask
- No priority badges in reports
- No "Sub-tasks:" label
```

### Utility Functions
```typescript
formatTime(seconds) - Format seconds to HH:MM:SS
formatDuration(milliseconds) - Format duration for display
```

## 🎨 CSS & Styling

### Common CSS Classes
```css
/* Priority Colors */
bg-purple-100 text-purple-800 border-purple-200 /* urgent */
bg-red-100 text-red-800 border-red-200 /* high */
bg-yellow-100 text-yellow-800 border-yellow-200 /* medium */
bg-green-100 text-green-800 border-green-200 /* low */

/* Status Colors */
bg-gray-100 text-gray-800 /* pending */
bg-blue-100 text-blue-800 /* in_progress */
bg-green-100 text-green-800 /* completed */
bg-red-100 text-red-800 /* blocked */
bg-gray-100 text-gray-600 /* archived */
```

## 🛠️ Usage Guidelines

### When Adding New Features
1. **Check this reference first** before creating new functions
2. **Reuse existing API endpoints** when possible
3. **Follow existing naming conventions** (camelCase for JS, snake_case for DB)
4. **Use existing types and interfaces** to maintain consistency
5. **Update this document** when adding new reusable components

### Database Operations
- Always use `getDb()` singleton for database operations
- Use `getAuthService()` for user-related operations
- Use `getAttendanceService()` for attendance operations
- Database fields use **snake_case** (e.g., `user_id`, `created_at`)
- TypeScript/JS uses **camelCase** (e.g., `userId`, `createdAt`)

### API Conventions
- **GET** requests for fetching data
- **POST** requests for creating data
- **PUT** requests for updating data
- **DELETE** requests for deleting data
- **PATCH** requests for partial updates
- Always check authentication with JWT tokens
- Return consistent response formats: `{ success, data?, error? }`

### Type Safety
- Always use existing TypeScript interfaces
- Import types from appropriate files (`@/types/auth`, `@/types/attendance`)
- Use generic types for database operations: `db.get<User>()`, `db.all<Task>()`

## 🎯 Task Assigned System (Activity-Focused Lead Tracker)

### Purpose
The task tracker (formerly "leads") is designed to help managers track **WHO is working on WHAT** rather than being a full CRM. The core feature is activity logging.

### Key Concepts
1. **Activity Logging** - Every employee action on a lead, event, or supplier is logged with their name and timestamp
2. **Three Main Categories** - System supports three distinct categories:
   - **Leads**: Business opportunities (company-focused with company_name, location, lead_source, type_of_business, number_of_employees)
   - **Events**: Scheduled activities (event-focused with event_name, venue, event_date, event_time, number_of_attendees)
   - **Suppliers**: Supplier tracking (supplier-focused with supplier_name, supplier_location, supplier_capacity, supplier_specialization)
3. **Permission-Based Access** - Access to analytics and activity monitoring controlled by permissions (can_view_analytics, can_view_activity_monitor)
4. **Manager Visibility** - Users with permissions can see employee leaderboards, activity feeds, and stale leads
5. **Stale Lead Detection** - Automatically flags items with no activity in 30 days

### Core Workflow
**Employee:**
1. Go to `/dashboard/task-assigned`
2. Select category tab (Leads, Events, or Suppliers)
3. Click "Add Item" to create new item (shows category selection modal)
4. Fill out appropriate form based on category selected
5. Click "Log Activity" on existing items to track work
6. Submit (automatically tracked with employee name and timestamp)

**Manager/Authorized User:**
1. Go to `/dashboard/task-assigned/analytics` to view dashboard
2. View employee activity leaderboard
3. View recent activity feed
4. Check stale items alert
5. Follow up with employees as needed

### Field Structure
**Lead Fields** (when category = 'lead'):
- Required: company_name, category
- Optional: location, lead_source, type_of_business, number_of_employees
- Shared: contact_person, mobile_number, email_address, product, status, remarks, next_action, assigned_to

**Event Fields** (when category = 'event'):
- Required: event_name, category
- Optional: venue, event_date, event_time, number_of_attendees
- Shared: contact_person, mobile_number, email_address, product, status, remarks, next_action, assigned_to

**Supplier Fields** (when category = 'supplier'):
- Required: supplier_name, category
- Optional: supplier_location, supplier_capacity, supplier_specialization
- Shared: contact_person, mobile_number, email_address, product, status, remarks, next_action, assigned_to

### Important Function Names (DO NOT RECREATE)
- `getLeadService()` - Get LeadService singleton
- `createLead()` - Create new lead
- `logActivity()` - **KEY FUNCTION** - Log employee activity
- `getLeadsWithActivities()` - Get leads with activities
- `getDashboardStats()` - Get boss dashboard statistics

### Important API Endpoints (DO NOT RECREATE)
- `POST /api/leads` - Create lead
- `POST /api/leads/activities` - **KEY ENDPOINT** - Log activity
- `GET /api/leads/dashboard` - Get boss dashboard stats

### Important Components (DO NOT RECREATE)
- `AddLeadModal` - Create lead modal
- `LogActivityModal` - **KEY COMPONENT** - Log activity modal
- `ViewActivitiesModal` - View activity timeline modal

### Design Notes
- Professional black text in all forms (NOT light gray)
- Sales terminology: "closed" and "rejected" (NOT "won" and "lost")
- Apple/Steve Jobs aesthetic: generous white space, smooth rounded corners, subtle shadows

## 🔐 Permissions System Architecture

### Overview
The permissions system provides granular access control replacing the old role-based system. Admin users have all permissions automatically, while manager and employee users can be assigned specific permissions.

### Database Structure
```sql
-- permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE
);

-- user_permissions junction table
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by INTEGER REFERENCES users(id)
);
```

### Database Functions
```sql
-- Check if user has permission
CREATE FUNCTION user_has_permission(p_user_id INTEGER, p_permission_key VARCHAR)
RETURNS BOOLEAN;

-- Check if user has any of the permissions
CREATE FUNCTION user_has_any_permission(p_user_id INTEGER, p_permission_keys VARCHAR[])
RETURNS BOOLEAN;

-- Check if user has all permissions
CREATE FUNCTION user_has_all_permissions(p_user_id INTEGER, p_permission_keys VARCHAR[])
RETURNS BOOLEAN;
```

### Using Permissions in API Routes

**Example 1: Single Permission Check**
```typescript
import { getPermissionsService } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  const permissionsService = getPermissionsService();

  const hasPermission = await permissionsService.hasPermission(
    decoded.userId,
    'can_view_analytics'
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to view analytics' },
      { status: 403 }
    );
  }

  // Continue with authorized logic...
}
```

**Example 2: Multiple Permission Check**
```typescript
const hasAnyPermission = await permissionsService.hasAnyPermission(
  decoded.userId,
  ['can_manage_leads', 'can_assign_tasks']
);

if (!hasAnyPermission) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}
```

### Managing Permissions

**Grant Default Permissions to New User:**
```typescript
import { getPermissionsService } from '@/lib/permissions';

const permissionsService = getPermissionsService();
await permissionsService.grantDefaultPermissions(newUser.id, 'manager');
```

**Update User Permissions (Bulk):**
```typescript
const permissionKeys = ['can_view_analytics', 'can_view_activity_monitor'];
await permissionsService.updateUserPermissions(userId, permissionKeys, adminUserId);
```

**Check Permission in Frontend:**
```typescript
// User permissions are available in the user object
const canViewAnalytics = user?.permissions?.some(
  p => p.permission_key === 'can_view_analytics'
) || user?.role === 'admin';
```

### Available Permissions (Default Set)
1. **can_view_analytics** - View analytics dashboard
2. **can_view_activity_monitor** - View activity monitoring page
3. **can_manage_leads** - Create, edit, delete leads
4. **can_export_reports** - Export reports to Excel/PDF
5. **can_manage_team** - Manage team members
6. **can_assign_tasks** - Assign tasks to team members
7. **can_approve_leave** - Approve/reject leave requests
8. **can_manage_users** - Full user management (typically admin only)

### Adding New Permissions

**Step 1: Add to database**
```sql
INSERT INTO permissions (permission_key, display_name, description, category, is_active)
VALUES ('can_manage_suppliers', 'Manage Suppliers', 'Create, edit, and delete supplier records', 'Suppliers', TRUE);
```

**Step 2: Use in API route**
```typescript
const hasPermission = await permissionsService.hasPermission(userId, 'can_manage_suppliers');
```

**Step 3: Update frontend checks**
```typescript
const canManageSuppliers = user?.permissions?.some(
  p => p.permission_key === 'can_manage_suppliers'
) || user?.role === 'admin';
```

---

**Last Updated:** January 2026
**Version:** 5.3 (Attendance Edit Requests, Announcements & Export Features)
**Maintainer:** Claude Development Team

## 📝 Version 5.3 Updates (Current)

### Major Changes - Attendance Edit Requests, Announcements & Export Features:

#### 1. Attendance Time Edit Request System (NEW)
- **Employee workflow**: Submit edit requests for attendance times with reason
- **Admin workflow**: Review, approve, or reject requests with comments
- **Direct edit**: Admins can edit attendance times directly without approval flow
- **Audit trail**: Original times preserved as snapshot in requests

**New API Endpoints:**
- `POST /api/attendance/edit` - Create edit request or direct edit
- `GET /api/attendance/edit` - Get user's own edit requests
- `GET /api/admin/attendance/edit-requests` - Admin view all requests
- `POST /api/admin/attendance/edit-requests/[id]/approve` - Admin approve
- `POST /api/admin/attendance/edit-requests/[id]/reject` - Admin reject

**New AttendanceService Methods:**
- `getAttendanceById(attendanceId)` - Get attendance by ID
- `createEditRequest(userId, data)` - Create edit request (employee)
- `updateAttendanceTimeDirect(attendanceId, adminId, updates)` - Direct edit (admin)
- `getUserEditRequests(userId)` - Get user's requests
- `getEditRequests(filters)` - Admin get all requests with filters
- `approveEditRequest(requestId, adminId, comments?)` - Approve request
- `rejectEditRequest(requestId, adminId, comments)` - Reject request

#### 2. Announcements System (NEW)
- **Admin-only creation**: Only admins can create/edit/delete announcements
- **Role-based targeting**: Target all users, managers only, or employees only
- **Priority levels**: urgent, high, normal, low
- **Expiration support**: Announcements can have expiration dates
- **Auto-filtering**: Expired announcements automatically hidden

**New API Endpoints:**
- `GET /api/announcements` - Get active announcements for current user
- `POST /api/announcements` - Create announcement (admin)
- `PUT /api/announcements` - Update announcement (admin)
- `DELETE /api/announcements?id=` - Delete announcement (admin)

#### 3. Excel Export Features (NEW)
- **Attendance Export**: `GET /api/attendance/export?startDate=&endDate=`
  - Styled Excel with company logo
  - AM/PM time columns with break tracking
  - Tasks for each day included
  - Professional formatting with alternating rows

- **Leads Export**: `GET /api/leads/export?category=`
  - Category-specific columns (lead, event, supplier)
  - Styled headers with color coding
  - Auto-width columns
  - Title and date header

#### 4. Task Updates/Notes System (NEW)
- **Append-only updates**: Add notes/updates to tasks
- **User attribution**: Each update shows who added it and when
- **Persistent history**: Updates cannot be deleted

**New API Endpoint:**
- `POST /api/tasks/updates` - Add update/note to task

#### 5. Lead Schema Updates (NEW)
New fields added to leads table:
- `date_of_interaction` - Date of interaction for leads
- `lead_type` - Lead type classification
- `number_of_beneficiary` - Number of beneficiaries
- `disposition` - Lead disposition status
- `event_type` - Event type classification
- `event_start_date` / `event_end_date` - Event date range (replacing `event_date`)
- `event_lead` - Event lead person
- `event_report` - Event report file path

### New Database Tables (v5.3):

```sql
-- announcements (NEW - System-wide announcements)
id, title, content, priority, created_by, created_at, updated_at, expires_at, is_active, target_audience

-- attendance_edit_requests (NEW - Time edit request workflow)
id, attendance_id, user_id, original_check_in_time, original_check_out_time, original_break_start_time, original_break_end_time, requested_check_in_time, requested_check_out_time, requested_break_start_time, requested_break_end_time, reason, status, approver_id, approved_at, comments, created_at, updated_at
```

### New Types (v5.3):
```typescript
// Attendance Edit Request Types
interface AttendanceEditRequest { ... }
interface AttendanceEditRequestWithUser { ... }
interface CreateAttendanceEditRequestData { ... }
interface AttendanceEditRequestFilters { ... }
interface AttendanceEditRequestsResponse { ... }

// Announcement Types
interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  created_by: number;
  expires_at: string | null;
  is_active: boolean;
  target_audience: 'all' | 'managers' | 'employees';
}
```

---

## 📝 Version 5.2 Updates

### Major Changes - Subtask Support & Task Management Enhancements:

#### 1. Subtask System
- **Added subtask support** to tasks with full CRUD operations
- **Subtask structure**: `{id, title, notes, completed}`
- **Edit functionality** in check-in modal for correcting tasks
- **Checkbox + notes UI** in check-out modal for marking completion
- **Auto-save** subtask updates when checking out

#### 2. WhatsApp Report Format Changes
- **Text-based checkboxes**: `[x]` for completed, `[ ]` for pending
- **Removed priority badges** from reports for cleaner format
- **Removed "Sub-tasks:" label** for compact display
- **Notes in brackets** below each subtask in check-out reports
- **WhatsApp-compatible** format (no Unicode issues)

#### 3. Check-In Modal Improvements
- **Exact format match** with tasks page
- **Edit button** added to fix task mistakes before check-in
- **Sub-tasks UI** with add/remove functionality
- **Priority button selector** (4-column grid)
- **Removed "What happens next?" info card** to save space
- **Blue theme** for add/edit forms

#### 4. Check-Out Modal Enhancements
- **Filter updates**: Only shows pending/in_progress/blocked tasks (excludes completed)
- **Interactive subtasks**: Checkbox to toggle completion + textarea for notes
- **Real-time updates**: Changes saved to database before check-out
- **Status updates**: Each task can be updated to new status

#### 5. Task State Management
- **Consistent state structure** across check-in and tasks page
- **State fields**: `{title, subTasks[], priority}`
- **Removed description** from check-in modal (not needed)
- **Proper state resets** on cancel/create

### Component Changes (v5.2):
- **Check-in modal**: Added edit form with UPDATE button
- **Check-out modal**: Added subtask checkboxes and notes inputs
- **WhatsApp reports**: Updated format for both check-in and check-out

### Function Changes (v5.2):
- `handleOpenEditTask(task)` - Opens edit form with task data
- `handleUpdateTask()` - Saves edited task with subtasks
- `saveSubTaskUpdates()` - Saves all subtask changes before check-out
- `fetchCheckOutTasks()` - Now filters out completed tasks

---

## 📝 Version 5.1 Updates

### Major Changes - Modular 4-Side Layout Architecture:

#### 1. Persistent Shell Architecture
- **New component**: `PersistentShell` - Modular 4-side layout wrapper
  - Fixed positioning for all persistent sides (left, top, right, bottom)
  - Only center content refreshes during navigation
  - Prevents unnecessary re-renders of navigation components
  - Configurable sides via ReactNode slots

**Key Features:**
```typescript
// Location: src/app/dashboard/_components/PersistentShell.tsx
interface PersistentShellProps {
  leftSidebar: ReactNode;
  topBar: ReactNode;
  rightPanel?: ReactNode;  // Optional
  bottomBar?: ReactNode;   // Optional
  children: ReactNode;      // Main content area
}

// Layout Dimensions:
- Top Bar: h-16 (64px), z-40, fixed top
- Left Sidebar: w-64 (256px), z-30, fixed left
- Right Panel: w-16 (64px), z-30, fixed right
- Bottom Bar: h-12 (48px), z-30, fixed bottom
- Main Content: flex-1, h-full, p-2.5 (10px padding)
```

**Main Content Behavior:**
- `h-full` ensures full viewport height usage
- `overflow-hidden` at wrapper level, individual pages handle scrolling
- `p-2.5` provides consistent 10px padding across all pages
- Responsive margins adjust based on active sides

#### 2. Dashboard Layout Components

**LeftSidebar** (`src/app/dashboard/_components/LeftSidebar.tsx`):
- Refactored from original Sidebar component
- Collapsible with toggle animation (256px ↔ 64px)
- Navigation items with active state highlighting
- User profile section with avatar
- Dark theme with neutral color palette

**TopBar** (`src/app/dashboard/_components/TopBar.tsx`):
- Refactored from original Header component
- Real-time clock and weather display
- Search functionality
- Quick action buttons
- User menu with logout
- Status indicators (working/offline)

**RightPanel** (`src/app/dashboard/_components/RightPanel.tsx`):
- **Context-aware dynamic sidebar** (64px width)
- Shows different icons based on current route
- Tasks page actions: WhatsApp, Export, Calendar, Background, Settings
- Other pages: Default Info icon
- Uses custom events for cross-component communication
- Icon-only design with tooltips

**BottomBar** (`src/app/dashboard/_components/BottomBar.tsx`):
- System status footer
- Copyright information
- Full-width spanning design
- Minimal height (48px)

**DashboardLayoutProvider** (`src/app/dashboard/_providers/DashboardLayoutProvider.tsx`):
- **Centralized state management** for all dashboard data
- Real-time polling (time, weather, attendance status)
- Sidebar collapse state
- Provides data to all layout components via context

**Provider Features:**
```typescript
// Location: src/app/dashboard/_providers/DashboardLayoutProvider.tsx
interface DashboardLayoutContextType {
  user: User | null;
  currentTime: Date;
  weather: WeatherData | null;
  isWorking: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// Polling Intervals:
- Time: Updates every second
- Weather: Updates every 30 minutes
- Working status: Syncs with attendance state
```

#### 3. Event-Driven Architecture (RightPanel ↔ Pages)

**Custom Events System:**
- RightPanel dispatches custom events
- Individual pages listen for events
- Maintains separation of concerns
- No prop drilling needed

**Example Implementation:**
```typescript
// RightPanel dispatches (src/app/dashboard/_components/RightPanel.tsx):
window.dispatchEvent(new CustomEvent('openReportModal'));
window.dispatchEvent(new CustomEvent('toggleBackgroundMenu'));

// Page listens (src/app/dashboard/tasks/page.tsx):
useEffect(() => {
  const handleOpenReport = () => setShowReportTypeModal(true);
  const handleToggleBg = () => setShowBackgroundMenu(prev => !prev);

  window.addEventListener('openReportModal', handleOpenReport);
  window.addEventListener('toggleBackgroundMenu', handleToggleBg);

  return () => {
    window.removeEventListener('openReportModal', handleOpenReport);
    window.removeEventListener('toggleBackgroundMenu', handleToggleBg);
  };
}, []);
```

#### 4. Unified Dark Theme (Neutral Palette)

**Global Color Changes:**
- **Replaced all `gray-` colors with `neutral-`**
- Reason: Tailwind's gray palette has blue undertones
- Neutral palette provides true gray without color cast
- Consistent across all dashboard components

**Color Mappings:**
```typescript
// Old → New
gray-900 → neutral-900   // Main background
gray-800 → neutral-800   // Sidebar/card backgrounds
gray-700 → neutral-700   // Borders
gray-600 → neutral-600   // Secondary text
gray-500 → neutral-500   // Muted text
gray-400 → neutral-400   // Disabled text
gray-300 → neutral-300   // Light borders
gray-200 → neutral-200   // Subtle borders
gray-100 → neutral-100   // Light backgrounds
gray-50  → neutral-50    // Very light backgrounds

// Accent colors remain unchanged:
blue-400, blue-500, blue-600   // Primary actions
green-400, green-500           // Success states
red-400, red-500               // Error states
yellow-400, yellow-500         // Warning states
purple-400, purple-500         // Special states
```

#### 5. Dashboard Home Page Updates

**Attendance Calendar Fullscreen:**
- Removed card wrapper (no rounded borders, shadow)
- Removed max-width constraint
- Fills entire viewport height
- Optimized spacing (reduced padding and margins)
- Dark theme with neutral colors

**Layout Changes:**
```typescript
// Location: src/app/dashboard/page.tsx

// Removed:
- Outer padding container (was p-4 sm:p-6 lg:p-8)
- Max-width wrapper (was mx-auto max-w-7xl)
- Card styling (was rounded-2xl shadow-lg border)

// Updated:
- Content padding: p-6 → px-6 py-4 (reduced vertical)
- Navigation header: mb-6 → mb-4
- Shift info: mb-4 p-3 → mb-3 p-2.5
- Day rows: py-4 → py-3
- Week calendar: flex-1 flex flex-col (fills space)
- Each day row: flex-1 (equal height distribution)

// Dark Theme Colors:
- Background: neutral-900
- Tabs: blue-400/neutral-400
- Navigation buttons: neutral-800 hover
- Date text: white
- Today button: neutral-800 bg with blue-400 text
- Shift info: neutral-800/50 bg with neutral-700 border
- Day borders: neutral-800
- Timeline bars: neutral-700 border with neutral-800/50 bg
```

#### 6. Tasks Page Updates

**Removed Right Action Bar:**
- Deleted 64px wide right sidebar from tasks page
- Moved all icons to global RightPanel
- Freed up ~320px more horizontal space
- Kept mobile FAB for WhatsApp reports

**Page Optimization:**
```typescript
// Location: src/app/dashboard/tasks/page.tsx

// Removed:
- Right action bar (was 64px width with icons)
- Outer padding (was p-4 sm:p-6 lg:p-8)

// Result:
- Uses 10px padding from PersistentShell
- Maximum usable space for kanban board
- Icons accessible from global right sidebar
```

#### 7. Component Architecture Patterns

**Slot-Based Design:**
- Parent components accept ReactNode children
- Pure presentational components
- No data fetching in layout components
- Data flows from provider to components

**State Management Pattern:**
```typescript
// Provider handles data:
DashboardLayoutProvider → useDashboardLayout hook

// Components consume via hook:
const { user, currentTime, weather } = useDashboardLayout();

// Benefits:
- Single source of truth
- No prop drilling
- Easy to add new global state
- Centralized polling logic
```

**File Structure:**
```
src/app/dashboard/
├── _components/
│   ├── PersistentShell.tsx      # Main layout wrapper
│   ├── LeftSidebar.tsx          # Navigation sidebar
│   ├── TopBar.tsx               # Header with clock/weather
│   ├── RightPanel.tsx           # Context-aware action sidebar
│   └── BottomBar.tsx            # Footer
├── _providers/
│   └── DashboardLayoutProvider.tsx  # Centralized state
├── layout.tsx                   # Dashboard layout wrapper
└── page.tsx                     # Home page (attendance)
```

### Component Reference (DO NOT RECREATE):

**Layout Components:**
- `PersistentShell({ leftSidebar, topBar, rightPanel, bottomBar, children })` - 4-side layout wrapper
- `LeftSidebar({ user, isCollapsed, onToggle, onLogout })` - Navigation sidebar
- `TopBar({ user, currentTime, weather, isWorking, onToggleSidebar, onLogout })` - Header bar
- `RightPanel({ children? })` - Context-aware action sidebar
- `BottomBar()` - Footer component

**Provider Components:**
- `DashboardLayoutProvider({ user, children })` - Centralized dashboard state
- `useDashboardLayout()` - Hook to consume dashboard context

**Custom Events (RightPanel ↔ Pages):**
- `'openReportModal'` - Triggers report type selection modal
- `'toggleBackgroundMenu'` - Toggles background theme menu

### Usage Guidelines (v5.1):

**Adding New Dashboard Pages:**
```typescript
// New pages automatically inherit:
- 10px padding from PersistentShell
- Dark theme with neutral colors
- Full height layout
- Access to dashboard context via useDashboardLayout()

// No need to add:
- Outer wrappers or containers
- Custom padding (unless specific requirements)
- Header/sidebar/footer (already provided)
```

**Adding RightPanel Actions for New Pages:**
```typescript
// Update RightPanel.tsx to add route-specific icons:
{pathname === '/dashboard/your-page' && (
  <button
    onClick={() => {
      window.dispatchEvent(new CustomEvent('yourCustomEvent'));
    }}
    className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative"
    title="Your Action"
  >
    <YourIcon className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />
    <span className="text-[10px] text-neutral-400 mt-1 font-medium">Action</span>
  </button>
)}

// Listen for event in your page:
useEffect(() => {
  const handler = () => { /* your logic */ };
  window.addEventListener('yourCustomEvent', handler);
  return () => window.removeEventListener('yourCustomEvent', handler);
}, []);
```

**Color Theme Consistency:**
```typescript
// Always use neutral palette for grays:
- Backgrounds: neutral-900, neutral-800
- Borders: neutral-700, neutral-600
- Text: white, neutral-300, neutral-400

// Use accent colors for interactive elements:
- Primary: blue-400, blue-500
- Success: green-400, green-500
- Error: red-400, red-500
- Warning: yellow-400, yellow-500
```

---

## 📝 Version 5.0 Updates

### Major Changes - Permissions System & Route Restructuring:

#### 1. Granular Permissions System (Replaces Boss Role)
- **Removed 'boss' role** - Replaced with flexible permission-based access control
- **New tables**: `permissions`, `user_permissions` (junction table)
- **New service**: PermissionsService with 9 core methods
- **New API endpoints**: `/api/admin/permissions` (GET, POST, PUT, DELETE)
- **New component**: UserPermissionsModal for managing user permissions
- **8 default permissions**: can_view_analytics, can_view_activity_monitor, can_manage_leads, can_export_reports, can_manage_team, can_assign_tasks, can_approve_leave, can_manage_users
- **Database functions**: user_has_permission(), user_has_any_permission(), user_has_all_permissions()
- **Admin users**: Automatically have all permissions
- **Manager default permissions**: Analytics, activity monitoring, team management, task assignment, leave approval
- **Employee permissions**: Must be granted individually

#### 2. Password Expiry System (Admin Users)
- **New fields**: password_expires_at, password_expiry_days, last_password_change, force_password_reset
- **30-day rotation** for admin users
- **Automatic expiry tracking** via database triggers
- **Future enhancement**: Login checks and dashboard warnings (not yet implemented)

#### 3. Route Restructuring - "Leads" → "Task Assigned"
- **Renamed route**: `/dashboard/leads` → `/dashboard/task-assigned`
- **Updated sidebar**: "Leads" → "Task Assigned"
- **Maintained backwards compatibility**: Old /leads pages can be removed after migration
- **Updated all internal links** and navigation references

#### 4. Supplier Category Addition
- **Added third category**: 'supplier' (alongside 'lead' and 'event')
- **New supplier fields**: supplier_name, supplier_location, supplier_capacity, supplier_specialization
- **Supplier activity types**: active-supplier, recording, checking
- **Updated UI**: Task Assigned page now has 3 tabs instead of 2
- **Database migration**: RENAME_SUPPLY_TO_SUPPLIER.sql

#### 5. Authorization Changes
- **API routes**: Replaced role-based checks (admin/manager/boss) with permission checks
- **Activity monitor**: Now requires 'can_view_activity_monitor' permission
- **Analytics dashboard**: Now requires 'can_view_analytics' permission
- **Team members**: Removed boss-specific logic and isBoss property
- **Flexible access**: Permissions can be granted to any role

### Database Changes (v5.0):
- **Added tables**: permissions, user_permissions
- **Updated users table**: Added password_expires_at, password_expiry_days, last_password_change, force_password_reset
- **Updated leads table**: Added supplier_name, supplier_location, supplier_capacity, supplier_specialization
- **Updated category enum**: Changed from ('lead', 'event', 'supply') to ('lead', 'event', 'supplier')
- **Updated role enum**: Removed 'boss' from valid roles
- **Added database functions**: Permission checking functions

### API Changes (v5.0):
- **New endpoints**: `/api/admin/permissions` (full CRUD for permissions)
- **Updated endpoints**: `/api/leads/dashboard`, `/api/leads/activity-monitor` now use permission checks
- **Updated responses**: User objects now include permissions array
- **Admin/users endpoint**: Removed 'boss' from valid roles

### Component Changes (v5.0):
- **New component**: UserPermissionsModal (checkbox-based permission management)
- **Updated components**: Sidebar, Header, admin page, leads pages
- **Removed boss badges**: Header no longer shows boss badge
- **Updated dropdowns**: Changed "Supplies" → "Supplier" throughout UI
- **Activity types**: Different activity types for supplier category

### Service Changes (v5.0):
- **New service**: PermissionsService (singleton with 9 methods)
- **Updated AuthService**: Returns user with password expiry info and permissions
- **Updated LeadService**: Changed all 'supply' references to 'supplier'

### Type Changes (v5.0):
- **Updated User/AuthUser**: Added password expiry fields and permissions array
- **New interfaces**: Permission, UserPermission
- **Updated LeadCategory**: 'lead' | 'event' | 'supplier'
- **Updated ActivityType**: Added supplier-specific activity types
- **Removed CreateUserData 'boss'**: No longer accepts boss role

---

## 📝 Version 4.1 Updates

### Lead Tracker Revision - Two Categories:
1. **Removed old subcategories** - Factory, School, Cooperative, DTI, Rotary, Event removed
2. **Added two main categories** - Now only 'lead' and 'event'
3. **Different fields per category**:
   - **Leads**: company_name, location, lead_source, type_of_business, number_of_employees
   - **Events**: event_name, venue, event_date, event_time, number_of_attendees
   - **Shared**: contact_person, mobile_number, email_address, product, status, remarks, next_action, assigned_to
4. **Updated UI** - Leads page now has 2 tabs instead of 6
5. **Dynamic forms** - AddLeadModal shows different fields based on category
6. **Category selection** - LeadTypeSelectionModal changed from "Company/Individual" to "Lead/Event"

### Database Changes (v4.1):
- `category` field: Changed from 6 options to 2 ('lead' | 'event')
- Removed `lead_type` field
- Added event fields: event_name, venue, event_date, event_time, number_of_attendees
- All specialized fields are nullable

---

## 📝 Version 4.0 Updates

### New Features Added:
1. **Leave Management System** - Complete leave request and approval workflow
2. **Notification System** - Global notification system for all app events
3. **Manager Hierarchy** - Manager-employee relationships for team management
4. **Enhanced User Profiles** - Added avatar, employee_id, position, manager_id fields
5. **Lead Type Selection** - Distinguish between company and individual leads
6. **Next Action Tracking** - Track next steps for leads
7. **Multiple Check-in Sessions** - Support multiple check-in/check-out per day
8. **Simplified Leave Types** - vacation, sick, absent, offset

### New Services:
- `LeaveService` - Complete leave management
- `NotificationService` - Notification management

### New API Endpoints:
- Authentication: `/api/auth/change-password`
- Leave: `/api/leave`, `/api/leave/approve`, `/api/leave/balance`, `/api/leave/team`
- Notifications: `/api/notifications`, `/api/notifications/count`
- Team: `/api/team/members`
- Attendance: `/api/attendance/summary`

### Database Changes (v4.2 - Configuration-Driven System):
- Added `status_config` table - Centralized status definitions
- Added `report_type_config` table - Dynamic report type configurations
- Added `task_reports` table - Task report snapshots with metadata
- Added `task_report_items` table - Task-to-report linkage
- Added `subtask_report_items` table - Subtask status tracking in reports
- Added fields: `last_reported_at`, `last_report_id` to tasks table
- Added view: `task_reports_summary` for easy report listing
- Added triggers: Auto-update `updated_at` timestamps

### API Changes (v4.2):
- New configuration endpoints: `/api/config/statuses`, `/api/config/report-types`
- New task report endpoints: `/api/reports` (POST, GET, PUT, DELETE)
- Enhanced report system with status snapshot capability
- Admin-only configuration management

### Database Changes (v4.1):
- Added `notifications` table
- Added fields: `avatar`, `manager_id`, `position`, `employee_id` to users
- Added fields: `lead_type`, `next_action` to leads
- leave_requests uses: leave_type IN ('vacation', 'sick', 'absent', 'offset')
- Added field: `sessions` to attendance
- Updated enums: leave types, attendance status (added 'leave')

---

**Version History:**
- **v5.2** (Jan 2026) - Subtask Support, Enhanced Task Management, WhatsApp Report Format Updates
- **v5.1** (Nov 2025) - Modular 4-Side Layout Architecture, Dark Theme with Neutral Palette, Event-Driven RightPanel
- **v5.0** (Nov 2025) - Granular Permissions System, Password Expiry, Supplier Category, Route Restructuring
- **v4.2** (Nov 2025) - Configuration-Driven Report System, Status Management
- **v4.1** (Jan 2025) - Leave Management, Notifications, Manager Hierarchy
- **v4.0** - Lead Tracker with Supply Category
- **v3.0** - Lead Tracker System (Leads & Events)
- **v2.0** - Task Management & File System
- **v1.0** - Initial HR System Setup