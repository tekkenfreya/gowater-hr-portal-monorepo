export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'supervisor' | 'admin';
  department: string;
  supervisorId?: string;
  employeeId: string;
  profileImage?: string;
  workSchedule: WorkSchedule;
  leaveBalance: LeaveBalance;
}

export interface WorkSchedule {
  workDays: string[]; // ['Monday', 'Tuesday', etc.]
  startTime: string; // '09:00'
  endTime: string; // '17:00'
  breakDuration: number; // minutes
  timezone: string;
}

export interface LeaveBalance {
  vacation: { used: number; total: number };
  sick: { used: number; total: number };
  absent: { count: number };
  offset: { available: number };
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDuration: number;
  totalHours: number;
  status: 'present' | 'absent';
  workLocation?: 'WFH' | 'Onsite' | 'Field';
  notes?: string;
}

export interface BreakRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  type: 'lunch' | 'tea' | 'personal' | 'meeting';
  notes?: string;
}

export interface SubTask {
  id: string;
  title: string;
  notes: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancel';
}

export interface TaskUpdate {
  update_id: string;
  user_id: number;
  user_name: string;
  update_text: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subTasks: SubTask[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number; // seconds
  isTimerRunning: boolean;
  estimatedHours?: number;
  category?: string;
  tags: string[];
  updates: TaskUpdate[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface LeaveRequest {
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

export interface RegularizationRequest {
  id: string;
  userId: string;
  date: string;
  type: 'missed-punch-in' | 'missed-punch-out' | 'early-leave' | 'late-arrival' | 'break-extension';
  requestedTime: string;
  actualTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface WhatsAppReport {
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

export interface Department {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  employees: string[];
  workSchedule: WorkSchedule;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'religious' | 'company';
  isOptional: boolean;
  description?: string;
}

export interface AttendanceSummary {
  userId: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkHours: number;
  totalBreakHours: number;
  overtimeHours: number;
  attendancePercentage: number;
  averageWorkHours: number;
  tasksCompleted: number;
  totalTasks: number;
  productivityScore: number;
}

export interface SupervisorDashboard {
  supervisorId: string;
  teamMembers: User[];
  pendingApprovals: {
    leaveRequests: LeaveRequest[];
    regularizationRequests: RegularizationRequest[];
  };
  teamAttendance: AttendanceSummary[];
  todayPresent: number;
  todayAbsent: number;
  teamProductivity: number;
}

export interface ExcelExportData {
  type: 'attendance' | 'leave' | 'tasks' | 'summary';
  period: {
    startDate: string;
    endDate: string;
  };
  userId?: string;
  departmentId?: string;
  data: unknown[];
  filename: string;
  generatedAt: Date;
  generatedBy: string;
}

export interface NotificationSettings {
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
    reports: {
      startReport: boolean;
      eodReport: boolean;
      weeklyReport: boolean;
      leaveNotifications: boolean;
    };
  };
  email: {
    enabled: boolean;
    reports: boolean;
    approvals: boolean;
  };
  push: {
    enabled: boolean;
    clockReminders: boolean;
    breakReminders: boolean;
  };
}

export interface AppSettings {
  workingHours: {
    start: string;
    end: string;
    breakDuration: number;
  };
  attendance: {
    allowEarlyClockIn: boolean;
    allowLateClockOut: boolean;
    requireLocation: boolean;
    autoClockOut: boolean;
    overtimeThreshold: number;
  };
  leave: {
    maxAdvanceRequest: number; // days
    requireApproval: boolean;
    carryOverLimit: number;
  };
  notifications: NotificationSettings;
}

// =====================================================
// ATTENDANCE AUTOMATION TYPES
// =====================================================

export interface AttendanceAutomationSettings {
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

export interface AttendanceAutomationFormData {
  isEnabled: boolean;
  autoCheckInTime: string;
  autoCheckOutTime: string;
  autoBreakStartTime: string;
  autoBreakDuration: number;
  defaultWorkLocation: 'WFH' | 'Onsite';
  workDays: string[];
}

export interface AttendanceManagementFilters {
  userId?: number;
  startDate?: string;
  endDate?: string;
  status?: 'present' | 'absent';
  workLocation?: 'WFH' | 'Onsite' | 'Field';
  page?: number;
  limit?: number;
}

export interface AttendanceRecordWithUser {
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
  status: 'present' | 'absent';
  workLocation?: 'WFH' | 'Onsite' | 'Field';
  notes?: string;
  isAutomated?: boolean; // whether this was created by automation
}

export interface BulkAttendanceOperation {
  type: 'update' | 'delete';
  attendanceIds: number[];
  updates?: Partial<{
    status: 'present' | 'absent';
    workLocation: 'WFH' | 'Onsite' | 'Field';
    notes: string;
  }>;
}

export interface AttendanceManagementResponse {
  records: AttendanceRecordWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AutomationExecutionResult {
  success: boolean;
  userId: number;
  action: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  timestamp: Date;
  error?: string;
}

export interface AutomationLog {
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
// ATTENDANCE TIME EDIT REQUEST TYPES
// =====================================================

export interface AttendanceEditRequest {
  id: number;
  attendanceId: number;
  userId: number;
  // Original times (snapshot for audit trail)
  originalCheckInTime?: string;
  originalCheckOutTime?: string;
  originalBreakStartTime?: string;
  originalBreakEndTime?: string;
  // Requested new times (null means no change requested)
  requestedCheckInTime?: string;
  requestedCheckOutTime?: string;
  requestedBreakStartTime?: string;
  requestedBreakEndTime?: string;
  // Request details
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  // Review details
  approverId?: number;
  approvedAt?: string;
  comments?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceEditRequestWithUser extends AttendanceEditRequest {
  userName: string;
  userEmail: string;
  userDepartment: string;
  attendanceDate: string;
  approverName?: string;
}

export interface CreateAttendanceEditRequestData {
  attendanceId: number;
  requestedCheckInTime?: string;
  requestedCheckOutTime?: string;
  requestedBreakStartTime?: string;
  requestedBreakEndTime?: string;
  reason: string;
}

export interface AttendanceEditRequestFilters {
  userId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceEditRequestsResponse {
  requests: AttendanceEditRequestWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}