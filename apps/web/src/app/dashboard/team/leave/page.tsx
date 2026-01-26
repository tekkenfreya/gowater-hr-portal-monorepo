'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface LeaveRequestWithDetails {
  id: number;
  user_id: number;
  leave_type: 'vacation' | 'sick' | 'absent' | 'offset';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: number;
  approved_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_email: string;
  employee_department: string;
  approver_name?: string;
  approver_email?: string;
  total_days: number;
}

export default function TeamLeaveApprovals() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  // Modal state for approval/rejection
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [comments, setComments] = useState('');

  // Redirect if not authenticated or not manager/admin
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
    if (!isLoading && user && user.role !== 'manager' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'admin')) {
      fetchTeamLeaveRequests();
    }
  }, [user, selectedStatus]);

  const fetchTeamLeaveRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const statusParam = selectedStatus === 'all' ? '' : `?status=${selectedStatus}`;
      const response = await fetch(`/api/leave/team${statusParam}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch team leave requests');
        return;
      }

      setLeaveRequests(data.data || []);
    } catch (error) {
      logger.error('Failed to fetch team leave requests', error);
      setError('Failed to fetch team leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (request: LeaveRequestWithDetails, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalAction(action);
    setComments('');
    setShowModal(true);
  };

  const processLeaveRequest = async () => {
    if (!selectedRequest) return;
    if (modalAction === 'reject' && !comments.trim()) {
      setError('Comments are required when rejecting a leave request');
      return;
    }

    try {
      setProcessingRequest(selectedRequest.id);
      setError('');
      setSuccess('');

      const response = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      logger.error(`Failed to ${modalAction} leave request`, error);
      setError(`Failed to ${modalAction} leave request. Please try again.`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: LeaveRequestWithDetails['status']) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeColor = (type: LeaveRequestWithDetails['leave_type']) => {
    const colors = {
      vacation: 'text-blue-600',
      sick: 'text-red-600',
      absent: 'text-orange-600',
      offset: 'text-green-600'
    };
    return colors[type];
  };

  const getLeaveTypeLabel = (type: LeaveRequestWithDetails['leave_type']) => {
    const labels = {
      vacation: 'Vacation Leave',
      sick: 'Sick Leave',
      absent: 'Absent',
      offset: 'Offset'
    };
    return labels[type];
  };

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

  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    return null;
  }

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Team Leave Approvals</h1>
              <p className="text-gray-800 font-medium">Review and approve leave requests from your team</p>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-800">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-800">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-800">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-800">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{leaveRequests.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-semibold text-gray-800">Filter by status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Leave Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-800">Loading leave requests...</p>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-800" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
                  <p className="mt-1 text-sm text-gray-800">
                    {selectedStatus === 'all' ? "No team leave requests found." : `No ${selectedStatus} requests found.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {request.employee_name}
                            </h3>
                            <span className={`font-medium capitalize ${getLeaveTypeColor(request.leave_type)}`}>
                              {getLeaveTypeLabel(request.leave_type)}
                            </span>
                            {getStatusBadge(request.status)}
                            <span className="text-sm text-gray-800">
                              {request.total_days} day{request.total_days > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 mb-1">
                            <strong>Dates:</strong> {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-800 mb-2">
                            <strong>Reason:</strong> {request.reason}
                          </div>
                          <div className="text-xs text-gray-800">
                            Applied on {new Date(request.created_at).toLocaleDateString()}
                            {request.employee_department && (
                              <span> • {request.employee_department}</span>
                            )}
                          </div>
                          {request.comments && (
                            <div className="text-xs text-gray-800 mt-1">
                              <strong>Comments:</strong> {request.comments}
                            </div>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleApprovalAction(request, 'approve')}
                              disabled={processingRequest === request.id}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                            >
                              {processingRequest === request.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleApprovalAction(request, 'reject')}
                              disabled={processingRequest === request.id}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                            >
                              {processingRequest === request.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

      {/* Approval/Rejection Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>

              <div className="mb-4 p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium text-gray-900">{selectedRequest.employee_name}</p>
                <p className="text-sm text-gray-800">{getLeaveTypeLabel(selectedRequest.leave_type)}</p>
                <p className="text-sm text-gray-800">
                  {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-800">{selectedRequest.total_days} day{selectedRequest.total_days > 1 ? 's' : ''}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Comments {modalAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={modalAction === 'approve' ? 'Optional comments...' : 'Please provide a reason for rejection...'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={processLeaveRequest}
                  disabled={processingRequest === selectedRequest.id}
                  className={`flex-1 px-4 py-2 text-white rounded-md font-medium transition-colors duration-200 ${
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
                  }}
                  disabled={processingRequest === selectedRequest.id}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md font-medium hover:bg-gray-400 transition-colors duration-200 disabled:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}