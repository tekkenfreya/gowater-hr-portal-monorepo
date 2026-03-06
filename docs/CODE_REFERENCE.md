# GoWater Code Reference

> **Last Updated:** 2026-01-28
> **Purpose:** Canonical reference for all services, hooks, types, and APIs
> **Usage:** Search (Ctrl+F) for method names before implementation
> **Maintenance:** Update when adding new services, hooks, or API routes
> **Recent Changes:** Migrated to Turborepo monorepo structure

---

## Monorepo Structure

```
gowater-monorepo/
├── apps/
│   ├── web/                 # Next.js web app (all paths below are relative to this)
│   │   └── src/
│   └── mobile/              # React Native Expo app
│       └── src/
├── packages/
│   └── types/               # Shared TypeScript types (@gowater/types)
│       └── src/
│           ├── attendance.ts
│           ├── auth.ts
│           └── leads.ts
└── docs/                    # This documentation
```

**Import paths:**
- Web app internal: `@/lib/...`, `@/types/...` (unchanged)
- Shared types: `import { User } from '@gowater/types'`
- Mobile app: Uses same API endpoints as web

---

## Table of Contents

1. [Services](#services)
   - [AuthService](#authservice)
   - [AttendanceService](#attendanceservice)
   - [AttendanceAutomationService](#attendanceautomationservice)
   - [LeaveService](#leaveservice)
   - [LeadService](#leadservice)
   - [PermissionsService](#permissionsservice)
   - [FileService](#fileservice)
   - [NotificationService](#notificationservice)
   - [WhatsAppService](#whatsappservice)
   - [UnitsService](#unitsservice)
2. [Hooks](#hooks)
3. [Contexts](#contexts)
4. [API Routes](#api-routes)
5. [Type Definitions](#type-definitions)
6. [Utility Functions](#utility-functions)

---

## Services

All services use the singleton pattern. Get instances using `get*Service()` functions.

### AuthService

**File:** `src/lib/auth.ts`
**Singleton:** `getAuthService()`
**Purpose:** Handle user authentication, authorization, and user management

#### Initialization

- `async initialize(): Promise<void>`
  - **Purpose:** Initialize the service and create default admin account
  - **Example:** `await getAuthService().initialize()`

#### Authentication Methods

- `async login(username: string, password: string): Promise<LoginResult>`
  - **Purpose:** Authenticate user with email or employee_id and password
  - **Params:**
    - `username` - User email or employee_id
    - `password` - Plain text password
  - **Returns:** `{success: boolean, user?: AuthUser, token?: string, error?: string}`
  - **Example:** `await getAuthService().login('admin@gowater.com', 'password')`

- `async verifyToken(token: string): Promise<AuthUser | null>`
  - **Purpose:** Verify JWT token and return user data
  - **Params:** `token` - JWT token string
  - **Returns:** AuthUser object or null if invalid
  - **Example:** `const user = await getAuthService().verifyToken(token)`

#### User Management Methods

- `async createUser(userData: CreateUserData): Promise<{success: boolean, error?: string, userId?: number}>`
  - **Purpose:** Create a new user account
  - **Params:** `userData` - User creation data (email, password, name, role, etc.)
  - **Returns:** `{success, error?, userId?}`
  - **Example:** `await getAuthService().createUser({email: 'user@example.com', password: 'pass', name: 'John'})`

- `async getAllUsers(): Promise<AuthUser[]>`
  - **Purpose:** Get all active users
  - **Returns:** Array of AuthUser objects
  - **Example:** `const users = await getAuthService().getAllUsers()`

- `async updateUserStatus(userId: number, status: 'active' | 'inactive'): Promise<boolean>`
  - **Purpose:** Change user's active/inactive status
  - **Returns:** true if successful
  - **Example:** `await getAuthService().updateUserStatus(1, 'inactive')`

- `async deleteUser(userId: number): Promise<boolean>`
  - **Purpose:** Soft delete user (appends timestamp to email)
  - **Returns:** true if successful
  - **Example:** `await getAuthService().deleteUser(5)`

- `async updateUserProfile(userId: number, profileData: {name?, department?, employeeName?, employeeId?, role?, position?, avatar?}): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Update user profile information
  - **Returns:** `{success, error?}`
  - **Example:** `await getAuthService().updateUserProfile(1, {name: 'New Name', department: 'IT'})`

- `async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Change user password with validation and complexity checks
  - **Validation:** Min 8 chars, uppercase, lowercase, number required
  - **Returns:** `{success, error?}`
  - **Example:** `await getAuthService().changePassword(1, 'oldPass123', 'newPass456')`

---

### AttendanceService

**File:** `src/lib/attendance.ts`
**Singleton:** `getAttendanceService()`
**Purpose:** Handle attendance tracking, check-in/out, breaks, and admin management

#### User Attendance Methods

- `async checkIn(userId: number, notes?: string, workLocation?: 'WFH' | 'Onsite' | 'Field', photoUrl?: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Check in for the day (creates or updates attendance record)
  - **Params:**
    - `userId` - User ID
    - `notes` - Optional notes
    - `workLocation` - 'WFH', 'Onsite', or 'Field' (default: 'WFH')
    - `photoUrl` - Optional URL of check-in photo (Cloudinary)
  - **Handles:** Admin pre-created records (records with no check_in_time), multiple sessions per day
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().checkIn(1, 'Starting work', 'Field', 'https://res.cloudinary.com/...')`

- `async checkOut(userId: number, notes?: string): Promise<{success: boolean, error?: string, totalHours?: number}>`
  - **Purpose:** Check out and calculate work hours (excluding break time)
  - **Returns:** `{success, error?, totalHours?}`
  - **Example:** `await getAttendanceService().checkOut(1, 'End of day')`

- `async getTodayAttendance(userId: number): Promise<AttendanceRecord | null>`
  - **Purpose:** Get today's attendance record for user
  - **Returns:** AttendanceRecord or null
  - **Example:** `const attendance = await getAttendanceService().getTodayAttendance(1)`

- `async getWeeklyAttendance(userId: number, startDate: string): Promise<AttendanceRecord[]>`
  - **Purpose:** Get week of attendance records starting from date
  - **Params:** `startDate` - ISO date string (YYYY-MM-DD)
  - **Returns:** Array of AttendanceRecords
  - **Example:** `await getAttendanceService().getWeeklyAttendance(1, '2025-12-16')`

- `async getAttendanceSummary(userId: number, startDate: string, endDate: string): Promise<AttendanceSummary>`
  - **Purpose:** Get attendance statistics summary for date range
  - **Returns:** `{totalDays, presentDays, absentDays, lateDays, totalHours}`
  - **Example:** `await getAttendanceService().getAttendanceSummary(1, '2025-12-01', '2025-12-31')`

- `async deleteTodayAttendance(userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete today's attendance record
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().deleteTodayAttendance(1)`

#### Break Management Methods

- `async startBreak(userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Start a break timer
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().startBreak(1)`

- `async endBreak(userId: number): Promise<{success: boolean, error?: string, breakDuration?: number}>`
  - **Purpose:** End break and add to total break duration (in seconds)
  - **Returns:** `{success, error?, breakDuration?}`
  - **Example:** `await getAttendanceService().endBreak(1)`

#### Admin Attendance Methods

- `async getAllUsersAttendance(filters?: AttendanceManagementFilters): Promise<AttendanceManagementResponse>`
  - **Purpose:** Get all users' attendance with filtering and pagination (admin only)
  - **Params:** `filters` - Optional filters (userId, startDate, endDate, status, workLocation, page, limit)
  - **Returns:** `{records, total, page, limit, totalPages}`
  - **Example:** `await getAttendanceService().getAllUsersAttendance({startDate: '2025-12-01', page: 1, limit: 50})`

- `async bulkUpdateAttendance(operation: BulkAttendanceOperation): Promise<{success: boolean, affected: number, error?: string}>`
  - **Purpose:** Bulk update or delete attendance records (admin only)
  - **Params:** `operation` - `{type: 'update'|'delete', attendanceIds: number[], updates?: {...}}`
  - **Returns:** `{success, affected, error?}`
  - **Example:** `await getAttendanceService().bulkUpdateAttendance({type: 'update', attendanceIds: [1,2,3], updates: {status: 'present'}})`

- `async deleteAttendanceRecord(attendanceId: number, adminId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete specific attendance record (admin only)
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().deleteAttendanceRecord(5, 1)`

- `async getAttendanceStatistics(startDate?: string, endDate?: string): Promise<{totalRecords, presentCount, absentCount, lateCount, averageHours, automatedCount}>`
  - **Purpose:** Get aggregated attendance statistics for admin dashboard
  - **Returns:** Statistics object
  - **Example:** `await getAttendanceService().getAttendanceStatistics('2025-12-01', '2025-12-31')`

#### Time Edit Request Methods *(NEW)*

- `async getAttendanceById(attendanceId: number): Promise<AttendanceRecord | null>`
  - **Purpose:** Get a single attendance record by ID
  - **Returns:** AttendanceRecord or null
  - **Example:** `await getAttendanceService().getAttendanceById(123)`

- `async createEditRequest(userId: number, data: CreateAttendanceEditRequestData): Promise<{success: boolean, requestId?: number, error?: string}>`
  - **Purpose:** Create a time edit request (employee submits request for approval)
  - **Params:** `data` - `{attendanceId, requestedCheckInTime?, requestedCheckOutTime?, requestedBreakStartTime?, requestedBreakEndTime?, reason}`
  - **Validation:** Checks ownership, existing pending requests
  - **Returns:** `{success, requestId?, error?}`
  - **Example:** `await getAttendanceService().createEditRequest(1, {attendanceId: 123, requestedCheckInTime: '2025-12-25T09:00:00Z', reason: 'Forgot to check in'})`

- `async updateAttendanceTimeDirect(attendanceId: number, adminId: number, updates: {...}): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Update attendance times directly (admin only, no approval needed)
  - **Params:** `updates` - `{checkInTime?, checkOutTime?, breakStartTime?, breakEndTime?}`
  - **Side Effects:** Recalculates total hours automatically
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().updateAttendanceTimeDirect(123, 1, {checkInTime: '2025-12-25T09:00:00Z'})`

- `async getUserEditRequests(userId: number): Promise<AttendanceEditRequestWithUser[]>`
  - **Purpose:** Get all edit requests for a specific user
  - **Returns:** Array of edit requests with user details
  - **Example:** `const requests = await getAttendanceService().getUserEditRequests(1)`

- `async getEditRequests(filters?: AttendanceEditRequestFilters): Promise<AttendanceEditRequestsResponse>`
  - **Purpose:** Get all edit requests with filtering and pagination (admin only)
  - **Params:** `filters` - `{userId?, status?, startDate?, endDate?, page?, limit?}`
  - **Returns:** `{requests, total, page, limit, totalPages}`
  - **Example:** `await getAttendanceService().getEditRequests({status: 'pending', page: 1, limit: 50})`

- `async approveEditRequest(requestId: number, adminId: number, comments?: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Approve an edit request and apply changes to attendance record
  - **Side Effects:** Updates attendance record with requested times, recalculates hours
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().approveEditRequest(5, 1, 'Approved')`

- `async rejectEditRequest(requestId: number, adminId: number, comments: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Reject an edit request with mandatory comments
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceService().rejectEditRequest(5, 1, 'Invalid reason')`

---

### AttendanceAutomationService

**File:** `src/lib/attendanceAutomation.ts`
**Singleton:** `getAttendanceAutomationService()`
**Purpose:** Manage automated attendance check-in/out scheduling for users

#### Settings Management Methods

- `async getAutomationSettings(userId?: number): Promise<AttendanceAutomationSettings | AttendanceAutomationSettings[] | null>`
  - **Purpose:** Get automation settings for a specific user or all users
  - **Params:** `userId` - Optional user ID (null for global settings, undefined for all)
  - **Returns:** Single settings object, array of settings, or null
  - **Example:** `const settings = await getAttendanceAutomationService().getAutomationSettings(1)`

- `async getEffectiveSettings(userId: number): Promise<AttendanceAutomationSettings | null>`
  - **Purpose:** Get effective settings for user (user-specific or falls back to global)
  - **Params:** `userId` - User ID
  - **Returns:** Effective AttendanceAutomationSettings or null
  - **Example:** `const effective = await getAttendanceAutomationService().getEffectiveSettings(1)`

- `async updateAutomationSettings(userId: number | null, settings: AttendanceAutomationFormData): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Create or update automation settings
  - **Params:**
    - `userId` - User ID or null for global settings
    - `settings` - Form data with automation configuration
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceAutomationService().updateAutomationSettings(1, {isEnabled: true, autoCheckInTime: '09:00', ...})`

- `async enableAutomation(userId: number | null, enabled: boolean): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Enable or disable automation for a user or globally
  - **Params:**
    - `userId` - User ID or null for global
    - `enabled` - true to enable, false to disable
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceAutomationService().enableAutomation(1, true)`

- `async deleteAutomationSettings(userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete user-specific settings (reverts to global settings)
  - **Params:** `userId` - User ID
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceAutomationService().deleteAutomationSettings(1)`

#### Query Methods

- `async getEnabledAutomations(): Promise<{userId: number, settings: AttendanceAutomationSettings}[]>`
  - **Purpose:** Get all users with automation enabled (for cron job processing)
  - **Returns:** Array of user IDs and their settings
  - **Example:** `const enabled = await getAttendanceAutomationService().getEnabledAutomations()`

#### Execution Methods

- `async processAutomatedAttendance(currentTime: Date): Promise<AutomationExecutionResult[]>`
  - **Purpose:** Execute automated attendance actions (called by cron job)
  - **Params:** `currentTime` - Current date/time for processing
  - **Returns:** Array of execution results (success/failure per user)
  - **Example:** `const results = await getAttendanceAutomationService().processAutomatedAttendance(new Date())`

#### Bulk Operations

- `async applyGlobalSettingsToUser(userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Copy global settings to a specific user
  - **Params:** `userId` - Target user ID
  - **Returns:** `{success, error?}`
  - **Example:** `await getAttendanceAutomationService().applyGlobalSettingsToUser(5)`

- `async applyGlobalSettingsToAllUsers(): Promise<{success: boolean, affected: number, error?: string}>`
  - **Purpose:** Copy global settings to all users (bulk operation)
  - **Returns:** `{success, affected, error?}`
  - **Example:** `await getAttendanceAutomationService().applyGlobalSettingsToAllUsers()`

---

### LeaveService

**File:** `src/lib/leave.ts`
**Singleton:** `getLeaveService()`
**Purpose:** Handle leave requests, approvals, and leave balance tracking

#### Leave Request Methods

- `async createLeaveRequest(data: CreateLeaveRequestData): Promise<{success: boolean, leaveRequestId?: number, error?: string}>`
  - **Purpose:** Submit a new leave request
  - **Params:** `data` - `{user_id, start_date, end_date, leave_type, reason}`
  - **Validation:** Checks for past dates, overlapping leaves
  - **Returns:** `{success, leaveRequestId?, error?}`
  - **Example:** `await getLeaveService().createLeaveRequest({user_id: 1, start_date: '2025-12-25', end_date: '2025-12-26', leave_type: 'vacation', reason: 'Holiday'})`

- `async getLeaveRequests(userId: number): Promise<LeaveRequestWithDetails[]>`
  - **Purpose:** Get all leave requests for a user
  - **Returns:** Array of leave requests with employee and approver details
  - **Example:** `const leaves = await getLeaveService().getLeaveRequests(1)`

- `async deleteLeaveRequest(leaveRequestId: number, userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete a pending leave request
  - **Restriction:** Only pending requests can be deleted
  - **Returns:** `{success, error?}`
  - **Example:** `await getLeaveService().deleteLeaveRequest(5, 1)`

#### Manager/Admin Methods

- `async getTeamLeaveRequests(managerId: number, status?: 'pending'|'approved'|'rejected'|'cancelled'): Promise<LeaveRequestWithDetails[]>`
  - **Purpose:** Get team leave requests for manager approval
  - **Params:** `status` - Optional filter by status
  - **Returns:** Array of team leave requests
  - **Example:** `await getLeaveService().getTeamLeaveRequests(2, 'pending')`

- `async approveLeaveRequest(leaveRequestId: number, approverId: number, comments?: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Approve a leave request and create attendance records
  - **Side Effects:** Creates attendance records with status='leave' for each day
  - **Returns:** `{success, error?}`
  - **Example:** `await getLeaveService().approveLeaveRequest(5, 2, 'Approved')`

- `async rejectLeaveRequest(leaveRequestId: number, approverId: number, comments: string): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Reject a leave request with mandatory comments
  - **Returns:** `{success, error?}`
  - **Example:** `await getLeaveService().rejectLeaveRequest(5, 2, 'Reason for rejection')`

#### Leave Balance

- `async getLeaveBalance(userId: number): Promise<LeaveBalance>`
  - **Purpose:** Get leave balance by type for current year
  - **Leave Types:** vacation (10), sick (5), absent (count only), offset (credits earned)
  - **Returns:** `{vacation: {used, total}, sick: {used, total}, absent: {count}, offset: {available}}`
  - **Example:** `const balance = await getLeaveService().getLeaveBalance(1)`

---

### LeadService

**File:** `src/lib/leads.ts`
**Factory:** `getLeadService()` (no singleton, creates new instance)
**Purpose:** CRM functionality for leads, events, suppliers, and activities

#### Lead Management Methods

- `async createLead(employeeName: string, leadData: LeadFormData): Promise<Lead>`
  - **Purpose:** Create a new lead, event, or supplier
  - **Params:**
    - `employeeName` - Name of employee creating the lead
    - `leadData` - Form data with category-specific fields
  - **Returns:** Created Lead object
  - **Example:** `await getLeadService().createLead('John Doe', {category: 'lead', company_name: 'Acme Corp', ...})`

- `async getLeadsByCategory(category: LeadCategory): Promise<Lead[]>`
  - **Purpose:** Get all leads filtered by category
  - **Params:** `category` - 'lead', 'event', or 'supplier'
  - **Returns:** Array of Leads
  - **Example:** `const leads = await getLeadService().getLeadsByCategory('lead')`

- `async getAllLeads(): Promise<Lead[]>`
  - **Purpose:** Get all leads across all categories
  - **Returns:** Array of all Leads
  - **Example:** `const allLeads = await getLeadService().getAllLeads()`

- `async getLeadById(leadId: string): Promise<Lead | null>`
  - **Purpose:** Get a single lead by ID
  - **Returns:** Lead or null
  - **Example:** `const lead = await getLeadService().getLeadById('uuid-here')`

- `async updateLead(leadId: string, updates: Partial<LeadFormData>): Promise<void>`
  - **Purpose:** Update lead fields
  - **Example:** `await getLeadService().updateLead('uuid', {status: 'closed-deal'})`

- `async deleteLead(leadId: string): Promise<void>`
  - **Purpose:** Delete a lead
  - **Example:** `await getLeadService().deleteLead('uuid')`

#### Activity Logging Methods

- `async logActivity(leadId: string, employeeName: string, activityData: ActivityFormData): Promise<LeadActivity>`
  - **Purpose:** Log an activity for a lead (call, email, meeting, etc.)
  - **Params:** `activityData` - `{activity_type, activity_description, start_date?, end_date?, status_update?}`
  - **Side Effects:** Updates lead's status if status_update provided
  - **Returns:** Created LeadActivity
  - **Example:** `await getLeadService().logActivity('lead-uuid', 'John', {activity_type: 'call', activity_description: 'Called about pricing'})`

- `async getActivitiesForLead(leadId: string): Promise<LeadActivity[]>`
  - **Purpose:** Get all activities for a specific lead
  - **Returns:** Array of LeadActivities
  - **Example:** `const activities = await getLeadService().getActivitiesForLead('uuid')`

- `async getAllActivities(): Promise<LeadActivity[]>`
  - **Purpose:** Get all activities across all leads
  - **Returns:** Array of all LeadActivities
  - **Example:** `const allActivities = await getLeadService().getAllActivities()`

- `async deleteActivity(activityId: string): Promise<void>`
  - **Purpose:** Delete an activity
  - **Example:** `await getLeadService().deleteActivity('activity-uuid')`

#### Advanced Query Methods (Optimized with SQL JOINs)

- `async getLeadsWithActivities(category?: LeadCategory): Promise<LeadWithActivities[]>`
  - **Purpose:** Get leads with their activities in a single optimized query
  - **Optimization:** Uses LEFT JOIN to avoid N+1 queries
  - **Returns:** Array of leads with activities, activity_count, and last_activity
  - **Example:** `const leadsWithActivities = await getLeadService().getLeadsWithActivities('lead')`

- `async getRecentActivitiesForAllLeads(limit: number = 50): Promise<(LeadActivity & {lead_name, lead_category, lead_status})[]>`
  - **Purpose:** Get recent activities across all leads with lead info (optimized)
  - **Returns:** Array of activities with lead details
  - **Example:** `const recent = await getLeadService().getRecentActivitiesForAllLeads(20)`

#### Analytics & Reporting Methods

- `async getEmployeeActivityBreakdown(startDate?: string, endDate?: string): Promise<EmployeeStats[]>`
  - **Purpose:** Get detailed activity breakdown by employee
  - **Returns:** Array of employee stats (activities by type, leads assigned, closed deals, etc.)
  - **Example:** `const stats = await getLeadService().getEmployeeActivityBreakdown('2025-12-01', '2025-12-31')`

- `async getStaleLeads(daysThreshold: number = 30): Promise<{total_stale, stale_leads, by_employee}>`
  - **Purpose:** Find leads with no activity in X days
  - **Returns:** Stale leads grouped by employee
  - **Example:** `const stale = await getLeadService().getStaleLeads(30)`

- `async getLeadAssignmentOverview(): Promise<AssignmentStats[]>`
  - **Purpose:** Get lead assignment statistics by employee
  - **Returns:** Array of assignment stats (total assigned, by category, by status)
  - **Example:** `const assignments = await getLeadService().getLeadAssignmentOverview()`

- `async getDashboardStats(): Promise<DashboardStats>`
  - **Purpose:** Get comprehensive dashboard statistics
  - **Returns:** Complete stats object with leads, activities, employee performance, and stale leads
  - **Example:** `const stats = await getLeadService().getDashboardStats()`

---

### PermissionsService

**File:** `src/lib/permissions.ts`
**Singleton:** `getPermissionsService()`
**Purpose:** Granular permission-based access control system

#### Initialization

- `async initialize(): Promise<void>`
  - **Purpose:** Initialize the service
  - **Example:** `await getPermissionsService().initialize()`

#### Permission Check Methods

- `async hasPermission(userId: number, permissionKey: string): Promise<boolean>`
  - **Purpose:** Check if user has a specific permission
  - **Note:** Admins automatically have all permissions
  - **Returns:** true if user has permission
  - **Example:** `const canApprove = await getPermissionsService().hasPermission(1, 'can_approve_leaves')`

- `async hasAnyPermission(userId: number, permissionKeys: string[]): Promise<boolean>`
  - **Purpose:** Check if user has ANY of the specified permissions (OR logic)
  - **Returns:** true if user has at least one permission
  - **Example:** `const hasAccess = await getPermissionsService().hasAnyPermission(1, ['can_view_analytics', 'can_manage_tasks'])`

- `async hasAllPermissions(userId: number, permissionKeys: string[]): Promise<boolean>`
  - **Purpose:** Check if user has ALL of the specified permissions (AND logic)
  - **Returns:** true if user has all permissions
  - **Example:** `const hasAll = await getPermissionsService().hasAllPermissions(1, ['can_manage_tasks', 'can_approve_leaves'])`

#### Get Permission Methods

- `async getUserPermissions(userId: number): Promise<UserPermission[]>`
  - **Purpose:** Get all permissions for a user with details
  - **Note:** Admins get synthetic permissions for all system permissions
  - **Returns:** Array of UserPermissions with granted_at and granted_by info
  - **Example:** `const perms = await getPermissionsService().getUserPermissions(1)`

- `async getAllPermissions(): Promise<Permission[]>`
  - **Purpose:** Get all available permissions in the system
  - **Returns:** Array of all active Permissions
  - **Example:** `const allPerms = await getPermissionsService().getAllPermissions()`

- `async getPermissionsByCategory(category: string): Promise<Permission[]>`
  - **Purpose:** Get permissions filtered by category
  - **Returns:** Array of Permissions in that category
  - **Example:** `const taskPerms = await getPermissionsService().getPermissionsByCategory('tasks')`

#### Modify Permission Methods

- `async grantPermission(userId: number, permissionKey: string, grantedBy: number): Promise<boolean>`
  - **Purpose:** Grant a permission to a user
  - **Returns:** true if successful
  - **Example:** `await getPermissionsService().grantPermission(5, 'can_manage_tasks', 1)`

- `async revokePermission(userId: number, permissionKey: string): Promise<boolean>`
  - **Purpose:** Revoke a permission from a user
  - **Returns:** true if successful
  - **Example:** `await getPermissionsService().revokePermission(5, 'can_manage_tasks')`

- `async updateUserPermissions(userId: number, permissionKeys: string[], grantedBy: number): Promise<boolean>`
  - **Purpose:** Replace all user permissions with new set
  - **Side Effects:** Deletes existing permissions and inserts new ones
  - **Returns:** true if successful
  - **Example:** `await getPermissionsService().updateUserPermissions(5, ['can_manage_tasks', 'can_view_analytics'], 1)`

- `async grantDefaultPermissions(userId: number, role: 'admin'|'employee'|'manager'|'intern', grantedBy: number): Promise<boolean>`
  - **Purpose:** Grant default permissions based on user role
  - **Defaults:**
    - admin: All permissions (automatically)
    - manager: can_manage_tasks, can_manage_attendance, can_approve_leaves, can_view_all_leads
    - employee: No default permissions
  - **Returns:** true if successful
  - **Example:** `await getPermissionsService().grantDefaultPermissions(5, 'manager', 1)`

---

### FileService

**File:** `src/lib/files.ts`
**Type:** Static class (no singleton, all methods are static)
**Purpose:** File upload, download, and management with Supabase Storage

#### Validation Methods

- `static validateFile(file: File): {valid: boolean, error?: string}`
  - **Purpose:** Validate file size and type
  - **Limits:** Max 50MB, restricted file types
  - **Returns:** `{valid, error?}`
  - **Example:** `const validation = FileService.validateFile(file)`

- `static formatFileSize(bytes: number): string`
  - **Purpose:** Format bytes into human-readable size
  - **Returns:** String like "1.5 MB"
  - **Example:** `const size = FileService.formatFileSize(1548576) // "1.48 MB"`

- `static getFileCategory(mimeType: string): string`
  - **Purpose:** Categorize file by MIME type
  - **Categories:** images, videos, documents, spreadsheets, presentations, archives
  - **Returns:** Category string
  - **Example:** `const category = FileService.getFileCategory('image/png') // "images"`

#### File Operation Methods

- `static async uploadFile(file: File, userId: number, customCategory?: string): Promise<FileUploadResult>`
  - **Purpose:** Upload file to Supabase Storage and save metadata
  - **Returns:** `{success, file?: StoredFile, error?}`
  - **Example:** `const result = await FileService.uploadFile(file, 1, 'documents')`

- `static async getUserFiles(userId: number, category?: string): Promise<StoredFile[]>`
  - **Purpose:** Get user's uploaded files, optionally filtered by category
  - **Returns:** Array of StoredFile objects
  - **Example:** `const files = await FileService.getUserFiles(1, 'images')`

- `static async getAllFiles(category?: string): Promise<StoredFile[]>`
  - **Purpose:** Get all files (admin), optionally filtered by category
  - **Returns:** Array of all StoredFile objects
  - **Example:** `const allFiles = await FileService.getAllFiles()`

- `static async deleteFile(fileId: string, userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete file from storage and database
  - **Returns:** `{success, error?}`
  - **Example:** `await FileService.deleteFile('file-uuid', 1)`

- `static async getFileDownloadUrl(filePath: string): Promise<string | null>`
  - **Purpose:** Generate signed URL for file download (1 hour expiry)
  - **Returns:** Signed URL or null
  - **Example:** `const url = await FileService.getFileDownloadUrl('files/1/file.pdf')`

---

### NotificationService

**File:** `src/lib/notifications.ts`
**Singleton:** `getNotificationService()`
**Purpose:** User notification management system

#### Notification Methods

- `async createNotification(data: CreateNotificationData): Promise<{success: boolean, notificationId?: number, error?: string}>`
  - **Purpose:** Create a new notification
  - **Params:** `data` - `{user_id, type, title, message, data?}`
  - **Types:** leave_request, leave_approved, leave_rejected, attendance_alert, task_assigned, system_update
  - **Returns:** `{success, notificationId?, error?}`
  - **Example:** `await getNotificationService().createNotification({user_id: 1, type: 'system_update', title: 'Maintenance', message: 'System will be down at 2 AM'})`

- `async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]>`
  - **Purpose:** Get user's notifications, optionally filtered to unread only
  - **Returns:** Array of Notifications
  - **Example:** `const unread = await getNotificationService().getUserNotifications(1, true)`

- `async markAsRead(notificationId: number, userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Mark a single notification as read
  - **Returns:** `{success, error?}`
  - **Example:** `await getNotificationService().markAsRead(5, 1)`

- `async markAllAsRead(userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Mark all user's notifications as read
  - **Returns:** `{success, error?}`
  - **Example:** `await getNotificationService().markAllAsRead(1)`

- `async getUnreadCount(userId: number): Promise<number>`
  - **Purpose:** Get count of unread notifications
  - **Returns:** Number of unread notifications
  - **Example:** `const count = await getNotificationService().getUnreadCount(1)`

- `async deleteNotification(notificationId: number, userId: number): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Delete a notification
  - **Returns:** `{success, error?}`
  - **Example:** `await getNotificationService().deleteNotification(5, 1)`

---

### WhatsAppService

**File:** `src/lib/whatsapp.ts`
**Singleton:** `whatsappService` (exported instance)
**Purpose:** WhatsApp Web integration for automated messaging

#### Initialization

- `async initialize(handlers: {onQR, onReady, onDisconnected, onAuthFailure}): Promise<void>`
  - **Purpose:** Initialize WhatsApp client with event handlers
  - **Params:** `handlers` - Event handler functions
  - **Example:** `await whatsappService.initialize({onQR: (qr) => console.log(qr), onReady: () => console.log('Ready'), ...})`

#### Messaging Methods

- `async sendMessage(messageData: WhatsAppMessage): Promise<boolean>`
  - **Purpose:** Send message to a contact or group
  - **Params:** `messageData` - `{to: phoneNumber, message: string, type: 'start-report'|'eod-report'|...}`
  - **Returns:** true if successful
  - **Example:** `await whatsappService.sendMessage({to: '1234567890', message: 'Hello', type: 'start-report'})`

- `async sendBulkMessage(recipients: string[], message: string, type: WhatsAppMessage['type']): Promise<{successful: string[], failed: {recipient, error}[]}>`
  - **Purpose:** Send message to multiple recipients with rate limiting
  - **Rate Limit:** 1 second delay between messages
  - **Returns:** `{successful, failed}`
  - **Example:** `const result = await whatsappService.sendBulkMessage(['111', '222'], 'Hello', 'weekly-summary')`

#### Contact & Chat Methods

- `async getChats(): Promise<{id, name, isGroup, participants, lastMessage}[]>`
  - **Purpose:** Get all chats (contacts and groups)
  - **Returns:** Array of chat objects
  - **Example:** `const chats = await whatsappService.getChats()`

- `async getContacts(): Promise<{id, name, number, isBlocked}[]>`
  - **Purpose:** Get all contacts
  - **Returns:** Array of contact objects
  - **Example:** `const contacts = await whatsappService.getContacts()`

#### Status & Control Methods

- `isClientReady(): boolean`
  - **Purpose:** Check if WhatsApp client is ready
  - **Returns:** true if ready
  - **Example:** `if (whatsappService.isClientReady()) { ... }`

- `getCurrentQRCode(): string | null`
  - **Purpose:** Get current QR code for scanning
  - **Returns:** QR code string or null
  - **Example:** `const qr = whatsappService.getCurrentQRCode()`

- `async disconnect(): Promise<void>`
  - **Purpose:** Disconnect and destroy WhatsApp client
  - **Example:** `await whatsappService.disconnect()`

- `async getClientInfo(): Promise<{wid, phone, name, platform} | null>`
  - **Purpose:** Get connected account information
  - **Returns:** Client info or null
  - **Example:** `const info = await whatsappService.getClientInfo()`

---

### WebhookService *(NEW v5.4)*

**File:** `src/lib/webhooks.ts`
**Singleton:** `getWebhookService()`
**Purpose:** Manage webhook subscriptions and fire events to external systems (n8n, Zapier, GHL)

#### Webhook Management Methods

- `async createWebhook(userId: number, data: CreateWebhookData): Promise<{success, webhook?, error?}>`
  - **Purpose:** Create a new webhook subscription
  - **Params:** `data` - `{name, url, events: string[], secret?, headers?}`
  - **Returns:** `{success, webhook?, error?}`

- `async getWebhooks(userId?: number): Promise<Webhook[]>`
  - **Purpose:** Get all webhooks, optionally filtered by creator
  - **Returns:** Array of Webhook objects

- `async updateWebhook(webhookId: number, data: UpdateWebhookData): Promise<{success, error?}>`
  - **Purpose:** Update webhook settings (name, url, events, secret, is_active)

- `async deleteWebhook(webhookId: number): Promise<{success, error?}>`
  - **Purpose:** Delete a webhook and its delivery logs (CASCADE)

#### Event Firing Methods

- `async fireEvent(event: WebhookEvent, payload: Record<string, unknown>): Promise<void>`
  - **Purpose:** Fire an event to all matching webhooks (runs in background, non-blocking)
  - **Events:** attendance.checked_in, attendance.checked_out, task.created, task.completed, leave.requested, leave.approved, lead.created, lead.status_changed, user.created, and more
  - **Example:** `getWebhookService().fireEvent('attendance.checked_in', { userId: 1, workLocation: 'WFH' })`

- `async testWebhook(webhookId: number): Promise<{success, statusCode?, responseBody?, error?}>`
  - **Purpose:** Send a test event to verify webhook connectivity

#### Logging Methods

- `async getWebhookLogs(filters: WebhookLogFilters): Promise<{logs, total, page, limit, totalPages}>`
  - **Purpose:** Get paginated delivery logs for debugging
  - **Params:** `filters` - `{webhookId?, event?, success?, startDate?, endDate?, page?, limit?}`

---

### ApiKeyService *(NEW v5.4)*

**File:** `src/lib/apiKeys.ts`
**Singleton:** `getApiKeyService()`
**Purpose:** Manage long-lived API keys for workflow tool authentication

#### Key Management Methods

- `async createApiKey(userId: number, data: CreateApiKeyData): Promise<{success, apiKey?, plaintextKey?, error?}>`
  - **Purpose:** Generate a new API key (plaintext returned ONCE)
  - **Params:** `data` - `{name, scopes?: ['read','write','admin'], expiresInDays?}`
  - **Security:** Key is SHA-256 hashed, only prefix stored for display

- `async getApiKeys(userId?: number): Promise<ApiKey[]>`
  - **Purpose:** List API keys (metadata only, never returns full key)

- `async revokeApiKey(keyId: number, userId: number): Promise<{success, error?}>`
  - **Purpose:** Soft-disable an API key (keeps audit trail)

- `async deleteApiKey(keyId: number, userId: number): Promise<{success, error?}>`
  - **Purpose:** Permanently delete an API key

#### Authentication Methods

- `async validateApiKey(plaintextKey: string): Promise<{valid, userId?, scopes?, keyId?, error?}>`
  - **Purpose:** Validate an API key on incoming requests (fast indexed lookup)
  - **Used by:** `authenticateRequest()` helper in `src/lib/authHelper.ts`

---

### Auth Helper *(NEW v5.4)*

**File:** `src/lib/authHelper.ts`
**Purpose:** Unified authentication that supports JWT cookies, Bearer tokens, AND API keys

- `async authenticateRequest(request: NextRequest): Promise<AuthResult>`
  - **Purpose:** Authenticate any incoming request using three methods (priority order):
    1. `X-API-Key` header (for workflow tools)
    2. `Authorization: Bearer <token>` (for mobile app)
    3. `auth-token` cookie (for web app)
  - **Returns:** `{authenticated, userId?, email?, role?, authMethod?, scopes?, error?}`
  - **Example:** `const auth = await authenticateRequest(request);`

---

### UnitsService *(NEW)*

**File:** `src/lib/units.ts`
**Singleton:** `getUnitsService()`
**Purpose:** Manage dispatched units (vending machines/dispensers) and service requests

#### Unit CRUD Methods

- `async getAllUnits(filters?: UnitFilters): Promise<{units: DispatchedUnit[], total: number}>`
  - **Purpose:** Get all units with filtering and pagination
  - **Params:** `filters` - `{status?, unitType?, search?, page?, limit?}`
  - **Returns:** `{units, total}`
  - **Example:** `await getUnitsService().getAllUnits({status: 'dispatched', page: 1, limit: 20})`

- `async getUnitById(id: number): Promise<DispatchedUnit | null>`
  - **Purpose:** Get a single unit by ID
  - **Returns:** DispatchedUnit or null
  - **Example:** `await getUnitsService().getUnitById(5)`

- `async getUnitBySerial(serial: string): Promise<DispatchedUnit | null>`
  - **Purpose:** Get a single unit by serial number
  - **Returns:** DispatchedUnit or null
  - **Example:** `await getUnitsService().getUnitBySerial('GW-VM-000001')`

- `async createUnit(input: CreateUnitInput, createdBy: number): Promise<{success: boolean, unit?: DispatchedUnit, error?: string}>`
  - **Purpose:** Register a new unit
  - **Params:** `input` - `{serialNumber, unitType, modelName, destination?, notes?}`
  - **Handles:** Duplicate serial detection (23505 unique violation)
  - **Returns:** `{success, unit?, error?}`
  - **Example:** `await getUnitsService().createUnit({serialNumber: 'GW-VM-000001', unitType: 'vending_machine', modelName: 'AquaPure 3000'}, adminId)`

- `async bulkCreateUnits(rows: BulkImportRow[], createdBy: number): Promise<{created: number, errors: {row: number, error: string}[]}>`
  - **Purpose:** Bulk import units from CSV-style data
  - **Params:** `rows` - Array of `{serial_number, unit_type, model_name, destination?, notes?}`
  - **Returns:** `{created, errors}`

- `async updateUnit(id: number, updates: Partial<{destination, status, notes, modelName}>): Promise<{success: boolean, unit?: DispatchedUnit, error?: string}>`
  - **Purpose:** Update unit fields. Auto-sets `dispatched_at` when status changes to 'dispatched', `verified_at` when 'verified'
  - **Returns:** `{success, unit?, error?}`

#### Service Request Methods

- `async getServiceRequests(filters?: ServiceRequestFilters): Promise<{requests: ServiceRequest[], total: number}>`
  - **Purpose:** Get service requests with filtering and pagination. Joins dispatched_units for serial info
  - **Params:** `filters` - `{status?, unitId?, page?, limit?}`
  - **Returns:** `{requests, total}`

- `async createServiceRequest(unitId: number, input: CreateServiceRequestInput): Promise<{success: boolean, requestId?: number, error?: string}>`
  - **Purpose:** Create a service request for a unit (public-facing, no auth required)
  - **Params:** `input` - `{customerName, contactNumber, email?, issueDescription}`
  - **Returns:** `{success, requestId?, error?}`

- `async updateServiceRequest(id: number, updates: UpdateServiceRequestInput): Promise<{success: boolean, error?: string}>`
  - **Purpose:** Update service request status. Auto-sets `resolved_at` when status is 'resolved'
  - **Params:** `updates` - `{status?, resolvedBy?}`
  - **Returns:** `{success, error?}`

#### Verification Method

- `async verifyUnit(serial: string, customerName?: string): Promise<VerifyResult>`
  - **Purpose:** Public verification endpoint. If unit is 'dispatched', auto-transitions to 'verified'
  - **Returns:** `{found, status?, unitType?, modelName?, dispatchedAt?, message}`

---

## Hooks

### useAuth

**File:** `src/hooks/useAuth.ts`
**Purpose:** Authentication state and actions

#### Return Values

```typescript
{
  user: User | null,
  isLoading: boolean,
  error: string | null,
  login: (username: string, password: string) => Promise<{success: boolean, error?: string}>,
  logout: () => Promise<void>,
  refetch: () => Promise<void>
}
```

#### Usage

```typescript
const { user, isLoading, error, login, logout, refetch } = useAuth();

// Login
await login('admin@gowater.com', 'password');

// Logout
await logout();

// Refresh user data
await refetch();
```

---

## Contexts

### AttendanceContext

**File:** `src/contexts/AttendanceContext.tsx`
**Provider:** `<AttendanceProvider>`
**Hook:** `useAttendance()`
**Purpose:** Manage attendance state and timers

#### Context Values

```typescript
{
  isTimedIn: boolean,
  isOnBreak: boolean,
  workDuration: number, // seconds
  breakDuration: number, // seconds
  checkInTime: Date | null,
  breakStartTime: Date | null,
  handleTimeIn: () => Promise<void>,
  handleTimeOut: () => Promise<void>,
  handleStartBreak: () => Promise<void>,
  handleEndBreak: () => Promise<void>,
  fetchTodayAttendance: () => Promise<void>
}
```

#### Usage

```typescript
const { isTimedIn, workDuration, handleTimeIn, handleTimeOut } = useAttendance();

// Check in
await handleTimeIn();

// Check out
await handleTimeOut();
```

---

### DashboardLayoutProvider

**File:** `src/app/dashboard/_providers/DashboardLayoutProvider.tsx`
**Provider:** `<DashboardLayoutProvider user={user}>`
**Hook:** `useDashboardLayout()`
**Purpose:** Centralized dashboard state with polling

#### Context Values

```typescript
{
  user: User | null,
  currentTime: Date,
  weather: Weather | null,
  isWorking: boolean,
  teamMembers: TeamMember[],
  notifications: Notification[],
  unreadCount: number,
  isSidebarCollapsed: boolean,
  toggleSidebar: () => void
}
```

#### Polling Intervals

- **Time:** Every 1 second
- **Weather:** Every 30 minutes
- **Working Status:** Every 30 seconds
- **Team Members:** Every 30 seconds

#### Usage

```typescript
const { currentTime, weather, isWorking, teamMembers } = useDashboardLayout();
```

---

## API Routes

All API routes are in `src/app/api/`. Authentication required unless noted.

### Authentication Routes

- `POST /api/auth/login`
  - **Body:** `{username: string, password: string}`
  - **Returns:** `{user: User}` with auth-token cookie

- `POST /api/auth/logout`
  - **Returns:** `{success: boolean}`

- `GET /api/auth/verify`
  - **Headers:** Cookie: auth-token
  - **Returns:** `{user: User}`

- `POST /api/auth/change-password`
  - **Body:** `{currentPassword: string, newPassword: string}`
  - **Returns:** `{success: boolean, error?: string}`

### Attendance Routes

- `GET /api/attendance`
  - **Returns:** `{attendance: AttendanceRecord | null}`

- `GET /api/attendance/today`
  - **Returns:** `{attendance: AttendanceRecord | null}`

- `GET /api/attendance/weekly?startDate=YYYY-MM-DD`
  - **Returns:** `{records: AttendanceRecord[]}`

- `GET /api/attendance/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - **Returns:** `{summary: AttendanceSummary}`

- `POST /api/attendance/checkin`
  - **Body:** `{workLocation?: 'WFH'|'Onsite', notes?: string}`
  - **Returns:** `{success: boolean, error?: string}`

- `POST /api/attendance/checkout`
  - **Body:** `{notes?: string}`
  - **Returns:** `{success: boolean, totalHours?: number, error?: string}`

- `POST /api/attendance/break/start`
  - **Returns:** `{success: boolean, error?: string}`

- `POST /api/attendance/break/end`
  - **Returns:** `{success: boolean, breakDuration?: number, error?: string}`

### Attendance Time Edit Routes *(NEW)*

- `POST /api/attendance/edit`
  - **Purpose:** Create edit request (employee) or direct edit (admin)
  - **Body:** `{attendanceId, requestedCheckInTime?, requestedCheckOutTime?, requestedBreakStartTime?, requestedBreakEndTime?, reason}`
  - **Returns:** `{success, message, requestId?, directEdit}`

- `GET /api/attendance/edit`
  - **Purpose:** Get user's own edit requests
  - **Returns:** `{requests: AttendanceEditRequestWithUser[]}`

### Attendance Export Routes *(NEW)*

- `GET /api/attendance/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - **Purpose:** Export user's attendance as styled Excel file
  - **Returns:** Excel file download (.xlsx)

### Admin Attendance Routes

- `GET /api/admin/attendance?userId=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status=present&page=1&limit=50`
  - **Returns:** `AttendanceManagementResponse`

- `POST /api/admin/attendance`
  - **Body:** `BulkAttendanceOperation`
  - **Returns:** `{success: boolean, affected: number, error?: string}`

- `GET /api/admin/attendance/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - **Returns:** Excel file download

- `GET /api/admin/attendance/automation`
  - **Returns:** `{settings: AttendanceAutomationSettings[]}`

- `POST /api/admin/attendance/automation`
  - **Body:** `{userId?: number, settings: AttendanceAutomationFormData}`
  - **Returns:** `{success: boolean, error?: string}`

### Admin Attendance Edit Request Routes *(NEW)*

- `GET /api/admin/attendance/edit-requests?userId=1&status=pending&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=50`
  - **Purpose:** Get all edit requests with filters (admin only)
  - **Returns:** `AttendanceEditRequestsResponse`

- `POST /api/admin/attendance/edit-requests/[id]/approve`
  - **Purpose:** Approve an edit request (admin only)
  - **Body:** `{comments?: string}`
  - **Returns:** `{success, message, error?}`

- `POST /api/admin/attendance/edit-requests/[id]/reject`
  - **Purpose:** Reject an edit request (admin only)
  - **Body:** `{comments: string}` (required)
  - **Returns:** `{success, message, error?}`

### Leave Routes

- `GET /api/leave`
  - **Returns:** `{leaveRequests: LeaveRequestWithDetails[]}`

- `POST /api/leave`
  - **Body:** `CreateLeaveRequestData`
  - **Returns:** `{success: boolean, leaveRequestId?: number, error?: string}`

- `DELETE /api/leave?id=1`
  - **Returns:** `{success: boolean, error?: string}`

- `POST /api/leave/approve`
  - **Body:** `{leaveRequestId: number, comments?: string}`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/leave/balance`
  - **Returns:** `{balance: LeaveBalance}`

- `GET /api/leave/team?status=pending`
  - **Returns:** `{leaveRequests: LeaveRequestWithDetails[]}`

### Admin User Routes

- `GET /api/admin/users`
  - **Returns:** `{users: AuthUser[]}`

- `POST /api/admin/users`
  - **Body:** `CreateUserData`
  - **Returns:** `{success: boolean, userId?: number, error?: string}`

- `GET /api/admin/users/[userId]`
  - **Returns:** `{user: AuthUser}`

- `PUT /api/admin/users/[userId]`
  - **Body:** Profile update data
  - **Returns:** `{success: boolean, error?: string}`

- `DELETE /api/admin/users/[userId]`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/admin/permissions`
  - **Returns:** `{permissions: Permission[], userPermissions: UserPermission[]}`

- `PUT /api/admin/permissions`
  - **Body:** `{userId: number, permissionKeys: string[]}`
  - **Returns:** `{success: boolean, error?: string}`

### Task Routes

- `GET /api/tasks`
  - **Returns:** `{tasks: Task[]}`

- `POST /api/tasks`
  - **Body:** Task data
  - **Returns:** `{success: boolean, taskId?: string, error?: string}`

- `PUT /api/tasks`
  - **Body:** Task update data
  - **Returns:** `{success: boolean, error?: string}`

- `DELETE /api/tasks?id=uuid`
  - **Returns:** `{success: boolean, error?: string}`

### Task Updates Routes *(NEW)*

- `POST /api/tasks/updates`
  - **Purpose:** Add an update/note to a task
  - **Body:** `{taskId: string, updateText: string}`
  - **Returns:** `{success: boolean, update?: TaskUpdate}`

### Leads Routes

- `GET /api/leads?category=lead`
  - **Returns:** `{leads: LeadWithActivities[]}`

- `POST /api/leads`
  - **Body:** `LeadFormData`
  - **Returns:** `{success: boolean, lead?: Lead, error?: string}`

- `PUT /api/leads`
  - **Body:** `{leadId: string, updates: Partial<LeadFormData>}`
  - **Returns:** `{success: boolean, error?: string}`

- `DELETE /api/leads?id=uuid`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/leads/activities?leadId=uuid`
  - **Returns:** `{activities: LeadActivity[]}`

- `POST /api/leads/activities`
  - **Body:** `{leadId: string, activityData: ActivityFormData}`
  - **Returns:** `{success: boolean, activity?: LeadActivity, error?: string}`

- `GET /api/leads/dashboard`
  - **Returns:** `{stats: DashboardStats}`

- `GET /api/leads/activity-monitor?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - **Returns:** `{employees: EmployeeStats[]}`

### Leads Export Routes *(NEW)*

- `GET /api/leads/export?category=lead|event|supplier`
  - **Purpose:** Export leads data as styled Excel file
  - **Query:** `category` - Optional, exports all if not specified
  - **Returns:** Excel file download (.xlsx)

### Announcements Routes *(NEW)*

- `GET /api/announcements`
  - **Purpose:** Get active announcements for current user (filtered by role)
  - **Returns:** `{announcements: Announcement[], message: string}`

- `POST /api/announcements`
  - **Purpose:** Create new announcement (admin only)
  - **Body:** `{title, content, priority?, expires_at?, target_audience?}`
  - **Returns:** `{announcement: Announcement, message: string}`

- `PUT /api/announcements`
  - **Purpose:** Update existing announcement (admin only)
  - **Body:** `{id, title?, content?, priority?, expires_at?, is_active?, target_audience?}`
  - **Returns:** `{announcement: Announcement, message: string}`

- `DELETE /api/announcements?id=number`
  - **Purpose:** Delete announcement (admin only)
  - **Returns:** `{message: string}`

### File Routes

- `GET /api/files?category=images`
  - **Returns:** `{files: StoredFile[]}`

- `POST /api/files`
  - **Body:** FormData with file
  - **Returns:** `{success: boolean, file?: StoredFile, error?: string}`

- `GET /api/files/download?filePath=files/1/file.pdf`
  - **Returns:** Signed download URL

### Report Routes

- `GET /api/reports?date=YYYY-MM-DD`
  - **Returns:** `{reports: Report[]}`

- `POST /api/reports`
  - **Body:** `{report_date, report_type, content}`
  - **Returns:** `{success: boolean, reportId?: number, error?: string}`

- `GET /api/config/statuses`
  - **Returns:** `{statuses: string[]}`

- `GET /api/config/report-types`
  - **Returns:** `{types: string[]}`

### WhatsApp Routes

- `POST /api/whatsapp/initialize`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/whatsapp/status`
  - **Returns:** `{isReady: boolean, qrCode?: string}`

- `POST /api/whatsapp/send`
  - **Body:** `WhatsAppMessage`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/whatsapp/contacts`
  - **Returns:** `{contacts: Contact[]}`

- `POST /api/whatsapp/disconnect`
  - **Returns:** `{success: boolean}`

### Notification Routes

- `GET /api/notifications?unreadOnly=true`
  - **Returns:** `{notifications: Notification[]}`

- `GET /api/notifications/count`
  - **Returns:** `{count: number}`

### Team Routes

- `GET /api/team/members`
  - **Purpose:** Get all team members with today's attendance status (available to all authenticated users)
  - **Returns:** `{success: boolean, users: TeamMemberWithStatus[]}`
  - **TeamMemberWithStatus fields:** `{id, email, name, role, department, position, employeeName, employeeId, avatar, isWorking, isOnBreak, checkInTime}`

### Profile Routes

- `GET /api/profile`
  - **Returns:** `{profile: User}`

- `PUT /api/profile`
  - **Body:** `{name?, department?, employeeName?, position?, avatar?}`
  - **Returns:** `{success: boolean, error?: string}`

- `GET /api/profile/preferences`
  - **Purpose:** Get user preferences (background, theme, etc.)
  - **Returns:** `{preferences: {tasksBoardBackground?: string, ...}}`

- `PATCH /api/profile/preferences`
  - **Body:** `{tasksBoardBackground?: string, ...}` (merges with existing)
  - **Returns:** `{success: boolean, preferences: object, error?: string}`

### Background Routes

- `GET /api/backgrounds`
  - **Purpose:** Get all active custom background images
  - **Returns:** `{backgrounds: CustomBackground[]}`

- `POST /api/backgrounds`
  - **Body:** FormData with file and name
  - **Validation:** Max 5MB, JPEG/PNG/WebP only
  - **Returns:** `{success: boolean, background?: {id, name, public_url}, error?: string}`

- `DELETE /api/backgrounds?id=uuid`
  - **Purpose:** Delete custom background (admin only)
  - **Returns:** `{success: boolean, error?: string}`

### Database & Utility Routes

- `POST /api/init-db`
  - **Purpose:** Initialize database with default data (secured)
  - **Headers:** `x-init-key` header matching `DB_INIT_SECRET` env var
  - **Returns:** `{success: boolean, message: string}`

- `POST /api/migrate-users`
  - **Purpose:** Migration utility to set all users status to 'active'
  - **Returns:** `{success: boolean, usersUpdated: number}`

- `GET /api/migrate-users`
  - **Purpose:** Check migration status
  - **Returns:** `{message: string, activeUsers: number}`

- `GET /api/admin/attendance/debug`
  - **Purpose:** Debug endpoint for attendance data verification (admin only)
  - **Returns:** Detailed attendance data for debugging

### Cron Routes

- `GET /api/cron/attendance-automation`
  - **Purpose:** Execute automated attendance (called by cron job)
  - **Headers:** `Authorization: Bearer <CRON_SECRET>`
  - **Returns:** `{success: boolean, results: AutomationExecutionResult[]}`

- `POST /api/cron/attendance-automation`
  - **Purpose:** Manually trigger automated attendance (admin testing)
  - **Returns:** `{success: boolean, results: AutomationExecutionResult[]}`

### Webhook Management Routes *(NEW v5.4)*

- `GET /api/admin/webhooks`
  - **Purpose:** List all webhook subscriptions (admin only)
  - **Returns:** `{webhooks: Webhook[], message: string}`

- `POST /api/admin/webhooks`
  - **Purpose:** Create new webhook subscription (admin only)
  - **Body:** `{name: string, url: string, events: string[], secret?: string, headers?: Record<string, string>}`
  - **Returns:** `{webhook: Webhook, message: string}`

- `PUT /api/admin/webhooks`
  - **Purpose:** Update webhook subscription (admin only)
  - **Body:** `{id: number, name?, url?, events?, secret?, headers?, is_active?}`
  - **Returns:** `{message: string}`

- `DELETE /api/admin/webhooks?id=123`
  - **Purpose:** Delete webhook and its logs (admin only)
  - **Returns:** `{message: string}`

- `POST /api/admin/webhooks/test`
  - **Purpose:** Send test event to a webhook (admin only)
  - **Body:** `{webhookId: number}`
  - **Returns:** `{success: boolean, statusCode?: number, responseBody?: string}`

- `GET /api/admin/webhooks/logs?webhookId=5&event=attendance.checked_in&success=false&page=1&limit=50`
  - **Purpose:** Get paginated webhook delivery logs (admin only)
  - **Returns:** `{logs: WebhookLog[], total, page, limit, totalPages}`

### API Key Management Routes *(NEW v5.4)*

- `GET /api/admin/api-keys`
  - **Purpose:** List all API keys (admin only, never returns full key)
  - **Returns:** `{apiKeys: ApiKey[], message: string}`

- `POST /api/admin/api-keys`
  - **Purpose:** Create new API key (admin only, returns plaintext key ONCE)
  - **Body:** `{name: string, scopes?: string[], expiresInDays?: number}`
  - **Returns:** `{apiKey: ApiKey, plaintextKey: string, message: string}`

- `DELETE /api/admin/api-keys?id=123&action=revoke`
  - **Purpose:** Revoke or delete API key (admin only)
  - **Returns:** `{message: string}`

### Admin Units Routes *(NEW)*

- `GET /api/admin/units?status=dispatched&unitType=vending_machine&search=GW&page=1&limit=20`
  - **Purpose:** Get all units with filtering and pagination (admin only)
  - **Returns:** `{units: DispatchedUnit[], total: number}`

- `POST /api/admin/units`
  - **Purpose:** Create a new unit (admin only)
  - **Body:** `{serialNumber, unitType, modelName, destination?, notes?}`
  - **Returns:** `{success, unit?, error?}`

- `POST /api/admin/units` (with `bulk: true`)
  - **Purpose:** Bulk import units (admin only)
  - **Body:** `{bulk: true, rows: BulkImportRow[]}`
  - **Returns:** `{success, created, errors}`

- `GET /api/admin/units/[id]`
  - **Purpose:** Get single unit by ID (admin only)
  - **Returns:** `{unit: DispatchedUnit}`

- `PUT /api/admin/units/[id]`
  - **Purpose:** Update unit fields (admin only)
  - **Body:** `{destination?, status?, notes?, modelName?}`
  - **Returns:** `{success, unit?, error?}`

- `GET /api/admin/units/[id]/barcode`
  - **Purpose:** Generate barcode SVG for a unit (admin only)
  - **Returns:** `{barcodeSvg: string}`

### Admin Service Request Routes *(NEW)*

- `GET /api/admin/service-requests?status=pending&unitId=5&page=1&limit=20`
  - **Purpose:** Get all service requests with filtering (admin only)
  - **Returns:** `{requests: ServiceRequest[], total: number}`

- `PUT /api/admin/service-requests`
  - **Purpose:** Update service request status (admin only)
  - **Body:** `{id, status, resolvedBy?}`
  - **Returns:** `{success, error?}`

### Public Verification Routes *(NEW)*

- `GET /api/verify/[serial]`
  - **Purpose:** Verify a unit by serial number (public, no auth)
  - **Returns:** `VerifyResult` - `{found, status?, unitType?, modelName?, dispatchedAt?, message}`

- `POST /api/verify/[serial]`
  - **Purpose:** Verify unit with customer name (public, no auth). Auto-transitions 'dispatched' to 'verified'
  - **Body:** `{customerName?: string}`
  - **Returns:** `VerifyResult`

- `POST /api/verify/[serial]/service-request`
  - **Purpose:** Submit a service request for a verified unit (public, no auth)
  - **Body:** `{customerName, contactNumber, email?, issueDescription}`
  - **Returns:** `{success, requestId?, error?}`

---

## Components

### RightPanel

**File:** `src/app/dashboard/_components/RightPanel.tsx`
**Purpose:** Fixed right-side action panel with quick access buttons

#### Features

- **Report Button** (Green/WhatsApp icon): Triggers report modal via custom event
- **Background Button** (Purple): Toggles background customization menu
- **Settings Button** (Gray): Navigates to settings page

#### Custom Events

The component dispatches custom window events:

```typescript
// To trigger report modal from RightPanel
window.dispatchEvent(new CustomEvent('openReportModal'));

// To toggle background menu
window.dispatchEvent(new CustomEvent('toggleBackgroundMenu'));
```

#### Usage

Add event listeners in your page component:

```typescript
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

---

## Type Definitions

### Authentication Types (`src/types/auth.ts`)

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
  preferences?: {
    tasksBoardBackground?: string;
    [key: string]: any;
  };
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

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
```

### Attendance Types (`src/types/attendance.ts`)

Key types (simplified - see file for full definitions):

```typescript
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
  location?: string;
  tasks: Task[];
  notes?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  subTasks: SubTask[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number; // seconds
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
}

interface AttendanceAutomationSettings {
  id: number;
  userId: number | null; // null for global settings
  isEnabled: boolean;
  autoCheckInTime: string | null; // HH:mm
  autoCheckOutTime: string | null; // HH:mm
  autoBreakStartTime: string | null; // HH:mm
  autoBreakDuration: number; // minutes
  defaultWorkLocation: 'WFH' | 'Onsite';
  workDays: string[]; // ['Monday', 'Tuesday', ...]
}

// NEW: Attendance Edit Request Types
interface AttendanceEditRequest {
  id: number;
  attendanceId: number;
  userId: number;
  originalCheckInTime?: string;
  originalCheckOutTime?: string;
  originalBreakStartTime?: string;
  originalBreakEndTime?: string;
  requestedCheckInTime?: string;
  requestedCheckOutTime?: string;
  requestedBreakStartTime?: string;
  requestedBreakEndTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: number;
  approvedAt?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceEditRequestWithUser extends AttendanceEditRequest {
  userName: string;
  userEmail: string;
  userDepartment: string;
  attendanceDate: string;
  approverName?: string;
}

interface CreateAttendanceEditRequestData {
  attendanceId: number;
  requestedCheckInTime?: string;
  requestedCheckOutTime?: string;
  requestedBreakStartTime?: string;
  requestedBreakEndTime?: string;
  reason: string;
}

interface AttendanceEditRequestFilters {
  userId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface AttendanceEditRequestsResponse {
  requests: AttendanceEditRequestWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// NEW: Announcement Types
interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  created_by: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
  target_audience: 'all' | 'managers' | 'employees';
}
```

### Lead Types (`src/types/leads.ts`)

```typescript
type LeadCategory = 'lead' | 'event' | 'supplier';
type ActivityType = 'call' | 'email' | 'meeting' | 'site-visit' | 'follow-up' | 'remark' | 'other' | 'active-supplier' | 'recording' | 'checking';

interface Lead {
  id: string;
  category: LeadCategory;

  // Lead-specific (NEW fields marked)
  date_of_interaction: string | null; // NEW
  lead_type: string | null; // NEW
  company_name: string | null;
  number_of_beneficiary: string | null; // NEW
  location: string | null;
  lead_source: string | null;

  // Event-specific (NEW fields marked)
  event_name: string | null;
  event_type: string | null; // NEW
  venue: string | null;
  event_date: string | null; // DEPRECATED - use event_start_date
  event_start_date: string | null; // NEW
  event_end_date: string | null; // NEW
  event_time: string | null;
  event_lead: string | null; // NEW
  number_of_attendees: string | null;
  event_report: string | null; // NEW - file path

  // Supplier-specific
  supplier_name: string | null;
  supplier_location: string | null;
  supplier_product: string | null;
  price: string | null;
  unit_type: string | null;

  // Shared fields
  contact_person: string | null;
  mobile_number: string | null;
  email_address: string | null;
  product: 'both' | 'vending' | 'dispenser' | null;
  status: string;
  remarks: string | null;
  disposition: string | null; // NEW
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface LeadActivity {
  id: string;
  lead_id: string;
  employee_name: string;
  activity_type: ActivityType;
  activity_description: string;
  start_date: string | null;
  end_date: string | null;
  status_update: string | null;
  created_at: string;
}

interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
  activity_count: number;
  last_activity?: LeadActivity;
}

interface DashboardStats {
  total_leads: number;
  active_leads: number;
  total_activities: number;
  activities_today: number;
  closed_deals: number;
  by_category: {category: LeadCategory, count: number, percentage: number}[];
  by_status: {status: string, count: number}[];
  employee_activities: {...}[];
  recent_activities: (LeadActivity & {company_name, category})[];
  stale_leads: LeadWithActivities[];
}
```

### Background Types

```typescript
type BoardBackground =
  | 'gradient-blue'
  | 'gradient-purple'
  | 'gradient-green'
  | 'gradient-orange'
  | 'solid-gray'
  | 'pattern-dots'
  | 'image-abstract'
  | 'image-nature'
  | string; // For custom uploaded backgrounds (URLs)

interface CustomBackground {
  id: string; // UUID
  name: string;
  file_path: string;
  public_url: string;
  uploaded_by: number;
  uploaded_at: string;
  is_active: boolean;
  sort_order: number;
}
```

### Unit Types (`src/types/units.ts`) *(NEW)*

```typescript
interface DispatchedUnit {
  id: number;
  serialNumber: string;
  unitType: 'vending_machine' | 'dispenser';
  modelName: string;
  destination: string | null;
  status: 'registered' | 'dispatched' | 'verified' | 'decommissioned';
  dispatchedAt: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRequest {
  id: number;
  unitId: number;
  customerName: string;
  contactNumber: string;
  email: string | null;
  issueDescription: string;
  status: 'pending' | 'in_progress' | 'resolved';
  resolvedAt: string | null;
  resolvedBy: number | null;
  createdAt: string;
  updatedAt: string;
  unit?: DispatchedUnit;
}

interface CreateUnitInput {
  serialNumber: string;
  unitType: 'vending_machine' | 'dispenser';
  modelName: string;
  destination?: string;
  notes?: string;
}

interface BulkImportRow {
  serial_number: string;
  unit_type: string;
  model_name: string;
  destination?: string;
  notes?: string;
}

interface VerifyResult {
  found: boolean;
  status?: string;
  unitType?: string;
  modelName?: string;
  dispatchedAt?: string;
  message: string;
}
```

---

## Utility Functions

### Logger (`src/lib/logger.ts`)

```typescript
logger.debug(...args)      // Development only
logger.log(...args)        // Development only
logger.info(...args)       // Always shown
logger.warn(...args)       // Always shown
logger.error(message, error)  // Sanitized in production
logger.security(message, details)  // Security events (filters sensitive data)
logger.audit(action, userId?, details?)  // Audit trail
```

### Timezone Utilities (`src/lib/timezone.ts`)

```typescript
formatPhilippineTime(dateString, options?)  // Format time in Philippine timezone
formatPhilippineDateTime(dateString)        // Format date and time
formatPhilippineDate(dateString)            // Format date only
getCurrentPhilippineTime()                  // Get current PH time
getPhilippineHour(dateString)               // Extract hour in PH timezone
getPhilippineDateString(date?)              // Get YYYY-MM-DD in PH timezone (for DB queries)
isLateCheckIn(dateString)                   // Check if after 10 AM
```

**Important:** Always use `getPhilippineDateString()` for attendance date queries to avoid UTC timezone issues.

### Database Wrapper (`src/lib/supabase.ts`)

```typescript
const db = getDb();

await db.get(table, conditions)              // Get single record
await db.all(table, conditions, orderBy?)    // Get multiple records
await db.insert(table, data)                 // Insert record
await db.update(table, data, conditions)     // Update records
await db.delete(table, conditions)           // Delete records
await db.executeRawSQL(sql, params)          // Execute raw SQL via RPC
```

---

## Quick Reference Index

### Common Operations

**Authentication:**
```typescript
const authService = getAuthService();
await authService.login('user', 'pass');
const user = await authService.verifyToken(token);
```

**Attendance:**
```typescript
const service = getAttendanceService();
await service.checkIn(userId, 'Starting work', 'WFH');
await service.checkOut(userId);
const today = await service.getTodayAttendance(userId);
```

**Leave:**
```typescript
const service = getLeaveService();
await service.createLeaveRequest({user_id: 1, start_date: '2025-12-25', ...});
await service.approveLeaveRequest(leaveId, approverId);
const balance = await service.getLeaveBalance(userId);
```

**Leads:**
```typescript
const service = getLeadService();
const lead = await service.createLead('John Doe', {category: 'lead', company_name: 'Acme', ...});
await service.logActivity(leadId, 'John', {activity_type: 'call', activity_description: '...'});
const stats = await service.getDashboardStats();
```

**Permissions:**
```typescript
const service = getPermissionsService();
const hasAccess = await service.hasPermission(userId, 'can_manage_tasks');
await service.grantPermission(userId, 'can_approve_leaves', adminId);
```

**Dispatched Units:**
```typescript
const service = getUnitsService();
const { units, total } = await service.getAllUnits({ status: 'dispatched' });
await service.createUnit({ serialNumber: 'GW-VM-000001', unitType: 'vending_machine', modelName: 'AquaPure 3000' }, adminId);
const result = await service.verifyUnit('GW-VM-000001', 'John Doe');
```

**Files:**
```typescript
const result = await FileService.uploadFile(file, userId);
const files = await FileService.getUserFiles(userId, 'images');
```

**Notifications:**
```typescript
const service = getNotificationService();
await service.createNotification({user_id: 1, type: 'system_update', title: '...', message: '...'});
const count = await service.getUnreadCount(userId);
```

---

**End of Code Reference**
