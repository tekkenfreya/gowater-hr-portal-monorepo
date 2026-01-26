'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface LeaveRequest {
  id: number;
  user_id: number;
  leave_type: 'vacation' | 'sick' | 'absent' | 'offset';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: number;
  approved_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_email?: string;
  employee_department?: string;
  approver_name?: string;
  approver_email?: string;
  total_days?: number;
}

interface TeamLeaveRequest extends LeaveRequest {
  employee_name: string;
  employee_email: string;
  employee_department?: string;
}

export default function LeaveTracker() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'apply' | 'history' | 'approvals'>('apply');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveBalance, setLeaveBalance] = useState({
    vacation: { used: 0, total: 20 },
    sick: { used: 0, total: 10 },
    absent: { count: 0 }, // Number of absences (no total, just count)
    offset: { available: 0 } // Credits earned from working holidays
  });

  // Leave application form state
  const [newLeave, setNewLeave] = useState({
    type: 'vacation' as LeaveRequest['leave_type'],
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Admin approval state
  const [teamLeaveRequests, setTeamLeaveRequests] = useState<TeamLeaveRequest[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedRequest, setSelectedRequest] = useState<TeamLeaveRequest | null>(null);
  const [comments, setComments] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch('/api/leave/balance');
      const data = await response.json();

      if (data.success) {
        setLeaveBalance(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch leave balance', error);
    }
  };

  // Fetch team leave requests (admin/manager only)
  const fetchTeamLeaveRequests = async () => {
    try {
      setApprovalLoading(true);
      const statusParam = selectedStatus === 'all' ? '' : `?status=${selectedStatus}`;
      const response = await fetch(`/api/leave/team${statusParam}`);
      const data = await response.json();

      if (data.success) {
        setTeamLeaveRequests(data.data || []);
      }
    } catch (error) {
      logger.error('Failed to fetch team leave requests', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle approval action
  const handleApprovalAction = (request: TeamLeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalAction(action);
    setComments('');
    setShowModal(true);
  };

  // Process leave request approval/rejection
  const processLeaveRequest = async () => {
    if (!selectedRequest) return;
    if (modalAction === 'reject' && !comments.trim()) {
      setError('Comments are required when rejecting a leave request');
      return;
    }

    try {
      setProcessingRequest(selectedRequest.id);
      setError('');

      const response = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveRequestId: selectedRequest.id,
          action: modalAction,
          comments: comments.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || `Failed to ${modalAction} leave request`);
        return;
      }

      setSuccess(`Leave request ${modalAction}d successfully`);
      setShowModal(false);
      setComments('');
      await fetchTeamLeaveRequests();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      logger.error(`Failed to ${modalAction} leave request`, error);
      setError(`Failed to ${modalAction} leave request. Please try again.`);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      fetchLeaveBalance();
    }
  }, [user]);

  // Fetch team leave requests when approvals tab is active
  useEffect(() => {
    if (user && isAdmin && activeTab === 'approvals') {
      fetchTeamLeaveRequests();
    }
  }, [user, isAdmin, activeTab, selectedStatus]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/leave');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch leave requests');
        return;
      }

      setLeaveRequests(data.data || []);
    } catch (error) {
      logger.error('Failed to fetch leave requests', error);
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyLeave = async () => {
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason.trim()) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      setError('');

      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          leave_type: newLeave.type,
          reason: newLeave.reason
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to submit leave request');
        return;
      }

      // Reset form and refresh data
      setNewLeave({
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });

      // Build email recipient list (exclude self if admin)
      const adminEmails = ['mark.belen@nxtlvlwater.xyz', 'rubyanne.talosig@nxtlvlwater.xyz'];
      const userEmail = user?.email?.toLowerCase();
      const filteredEmails = adminEmails.filter(email => email.toLowerCase() !== userEmail);

      // Only open email if there are recipients (skip if admin is the only one)
      if (filteredEmails.length > 0) {
        const emailTo = filteredEmails.join(',');
        const emailSubject = encodeURIComponent(`Leave Request - ${newLeave.type.charAt(0).toUpperCase() + newLeave.type.slice(1)} Leave`);
        const emailBody = encodeURIComponent(
          `Dear Admin,\n\n` +
          `I would like to request leave with the following details:\n\n` +
          `Leave Type: ${newLeave.type.charAt(0).toUpperCase() + newLeave.type.slice(1)} Leave\n` +
          `Start Date: ${newLeave.startDate}\n` +
          `End Date: ${newLeave.endDate}\n` +
          `Total Days: ${calculateDays(newLeave.startDate, newLeave.endDate)} day(s)\n` +
          `Reason: ${newLeave.reason}\n\n` +
          `Please review and approve my leave request.\n\n` +
          `Best regards,\n` +
          `${user?.name || 'Employee'}`
        );

        // Open email client with recipients
        window.location.href = `mailto:${emailTo}?subject=${emailSubject}&body=${emailBody}`;
      }

      // Refresh leave requests and balance
      await fetchLeaveRequests();
      await fetchLeaveBalance();

      setActiveTab('history');
    } catch (error) {
      logger.error('Failed to submit leave request', error);
      setError('Failed to submit leave request. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getLeaveTypeColor = (type: LeaveRequest['leave_type']) => {
    switch (type) {
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'absent': return 'bg-orange-100 text-orange-800';
      case 'offset': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeLabel = (type: LeaveRequest['leave_type']) => {
    switch (type) {
      case 'vacation': return 'Vacation Leave';
      case 'sick': return 'Sick Leave';
      case 'absent': return 'Absent';
      case 'offset': return 'Offset';
      default: return type;
    }
  };

  // Count pending requests for badge
  const pendingCount = teamLeaveRequests.filter(r => r.status === 'pending').length;

  // Show loading while verifying authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Tracker</h1>
              <p className="text-gray-800 font-medium">Manage your leave requests and track your balance</p>
            </div>
            <a
              href="https://forms.gle/5RVFw7DSpLrrfie16"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              <ExternalLinkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Fill Leave Form</span>
            </a>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <InfoIcon className="w-4 h-4" />
            <span>Complete the external form for additional leave requirements</span>
          </div>
        </div>

        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Vacation Leave */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 shadow-md border-2 border-cyan-200 hover:shadow-lg hover:border-cyan-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Vacation Leave</p>
                <p className="text-2xl font-bold text-blue-600">{leaveBalance.vacation.total - leaveBalance.vacation.used}</p>
                <p className="text-xs text-gray-800">Available days</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-800">
                <span>Used: {leaveBalance.vacation.used}</span>
                <span>Total: {leaveBalance.vacation.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full shadow-md shadow-blue-300/50"
                  style={{ width: `${(leaveBalance.vacation.used / leaveBalance.vacation.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Sick Leave */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 shadow-md border-2 border-red-200 hover:shadow-lg hover:border-red-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Sick Leave</p>
                <p className="text-2xl font-bold text-red-600">{leaveBalance.sick.total - leaveBalance.sick.used}</p>
                <p className="text-xs text-gray-800">Available days</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <MedicalIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-800">
                <span>Used: {leaveBalance.sick.used}</span>
                <span>Total: {leaveBalance.sick.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full shadow-md shadow-red-300/50"
                  style={{ width: `${(leaveBalance.sick.used / leaveBalance.sick.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Absents */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 shadow-md border-2 border-orange-200 hover:shadow-lg hover:border-orange-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Absents</p>
                <p className="text-2xl font-bold text-orange-600">{leaveBalance.absent.count}</p>
                <p className="text-xs text-gray-800">Total absences</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AbsentIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600">Number of times absent without prior notice</p>
            </div>
          </div>

          {/* Offsets */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-md border-2 border-green-200 hover:shadow-lg hover:border-green-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Offsets</p>
                <p className="text-2xl font-bold text-green-600">{leaveBalance.offset.available}</p>
                <p className="text-xs text-gray-800">Available credits</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <OffsetIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600">Credits earned from working on holidays</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('apply')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'apply'
                    ? 'border-p3-cyan text-p3-cyan'
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Apply Leave
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-p3-cyan text-p3-cyan'
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Leave History
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'approvals'
                      ? 'border-p3-cyan text-p3-cyan'
                      : 'border-transparent text-gray-800 hover:text-gray-900'
                  }`}
                >
                  <span>Leave Approvals</span>
                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'apply' ? (
              <div className="max-w-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Apply for Leave</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Leave Type</label>
                    <select
                      value={newLeave.type}
                      onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as LeaveRequest['leave_type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan"
                    >
                      <option value="vacation">Vacation Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="absent">Absent</option>
                      <option value="offset">Offset</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">End Date</label>
                      <input
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan"
                      />
                    </div>
                  </div>

                  {newLeave.startDate && newLeave.endDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800">
                        Total Days: {calculateDays(newLeave.startDate, newLeave.endDate)} days
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Reason</label>
                    <textarea
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan"
                      placeholder="Please provide a reason for your leave request..."
                    />
                  </div>

                  <button
                    onClick={handleApplyLeave}
                    disabled={formLoading}
                    className="bg-p3-cyan hover:bg-p3-cyan-dark disabled:bg-cyan-300 text-p3-navy-darkest px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    {formLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-p3-navy-darkest"></div>
                    )}
                    <span>{formLoading ? 'Submitting...' : 'Submit Leave Request'}</span>
                  </button>
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Leave History</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-800">Loading leave requests...</p>
                  </div>
                ) : leaveRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-800">No leave requests found.</p>
                    <p className="text-sm text-gray-800 mt-1">Apply for leave to see your requests here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaveRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                              {getLeaveTypeLabel(request.leave_type)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-gray-800">Duration</p>
                              <p className="text-gray-800">{request.start_date} to {request.end_date}</p>
                              <p className="text-gray-800">{request.total_days || 1} day{(request.total_days || 1) > 1 ? 's' : ''}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Applied Date</p>
                              <p className="text-gray-800">{new Date(request.created_at).toLocaleDateString()}</p>
                              {request.approver_name && (
                                <p className="text-gray-800">By: {request.approver_name}</p>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Reason</p>
                              <p className="text-gray-800">{request.reason}</p>
                            </div>
                          </div>
                          {request.comments && (
                            <div className="mt-3 p-3 rounded border border-gray-200">
                              <p className="text-sm font-semibold text-gray-800">Comments:</p>
                              <p className="text-sm text-gray-800">{request.comments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'approvals' && isAdmin ? (
              /* Leave Approvals Tab (Admin Only) */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Leave Approvals</h3>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-p3-cyan"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {approvalLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-800">Loading leave requests...</p>
                  </div>
                ) : teamLeaveRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-800">No leave requests found.</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedStatus === 'pending' ? 'No pending requests to review.' : `No ${selectedStatus} requests.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamLeaveRequests.map((request) => (
                      <div key={request.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-semibold text-gray-900">{request.employee_name}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                                {getLeaveTypeLabel(request.leave_type)}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="font-semibold text-gray-800">Duration</p>
                                <p className="text-gray-800">{request.start_date} to {request.end_date}</p>
                                <p className="text-gray-600">{calculateDays(request.start_date, request.end_date)} day(s)</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Applied Date</p>
                                <p className="text-gray-800">{new Date(request.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Reason</p>
                                <p className="text-gray-800">{request.reason}</p>
                              </div>
                            </div>
                            {request.comments && (
                              <div className="mt-3 p-3 rounded border border-gray-200 bg-white">
                                <p className="text-sm font-semibold text-gray-800">Comments:</p>
                                <p className="text-sm text-gray-800">{request.comments}</p>
                              </div>
                            )}
                          </div>
                          {request.status === 'pending' && (
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleApprovalAction(request, 'approve')}
                                disabled={processingRequest === request.id}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApprovalAction(request, 'reject')}
                                disabled={processingRequest === request.id}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Approval/Rejection Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <p className="font-semibold text-gray-900">{selectedRequest.employee_name}</p>
              <p className="text-sm text-gray-800">{getLeaveTypeLabel(selectedRequest.leave_type)}</p>
              <p className="text-sm text-gray-800">
                {selectedRequest.start_date} to {selectedRequest.end_date}
              </p>
              <p className="text-sm text-gray-600">
                {calculateDays(selectedRequest.start_date, selectedRequest.end_date)} day(s)
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Comments {modalAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-p3-cyan"
                placeholder={modalAction === 'approve' ? 'Optional comments...' : 'Please provide a reason for rejection...'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={processLeaveRequest}
                disabled={processingRequest === selectedRequest.id}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                }`}
              >
                {processingRequest === selectedRequest.id ? 'Processing...' : modalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setComments('');
                  setError('');
                }}
                disabled={processingRequest === selectedRequest.id}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AbsentIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function OffsetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MedicalIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}