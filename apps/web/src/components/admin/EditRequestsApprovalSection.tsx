'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AttendanceEditRequestWithUser } from '@/types/attendance';
import { formatPhilippineTime } from '@/lib/timezone';

export default function EditRequestsApprovalSection() {
  const [requests, setRequests] = useState<AttendanceEditRequestWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectComments, setRejectComments] = useState<{ [key: number]: string }>({});
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/attendance/edit-requests?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (error) {
      logger.error('Failed to fetch edit requests', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/admin/attendance/edit-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchRequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve request');
      }
    } catch (error) {
      logger.error('Failed to approve request', error);
      alert('An error occurred');
    }
    setProcessingId(null);
  };

  const handleReject = async (requestId: number) => {
    const comments = rejectComments[requestId];
    if (!comments?.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/admin/attendance/edit-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments })
      });

      if (response.ok) {
        setShowRejectForm(null);
        setRejectComments(prev => ({ ...prev, [requestId]: '' }));
        fetchRequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject request');
      }
    } catch (error) {
      logger.error('Failed to reject request', error);
      alert('An error occurred');
    }
    setProcessingId(null);
  };

  const formatTimeDisplay = (isoString?: string) => {
    if (!isoString) return '--';
    return formatPhilippineTime(isoString);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Time Edit Requests</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {statusFilter || ''} edit requests found
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              {/* Request Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{request.userName}</p>
                  <p className="text-sm text-gray-500">{request.userEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Attendance Date: {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(request.status)}
                  <p className="text-xs text-gray-400 mt-1">
                    Requested: {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Time Changes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                <div>
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="text-gray-600 line-through">{formatTimeDisplay(request.originalCheckInTime)}</p>
                  {request.requestedCheckInTime && (
                    <p className="text-green-600 font-medium">{formatTimeDisplay(request.requestedCheckInTime)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="text-gray-600 line-through">{formatTimeDisplay(request.originalCheckOutTime)}</p>
                  {request.requestedCheckOutTime && (
                    <p className="text-green-600 font-medium">{formatTimeDisplay(request.requestedCheckOutTime)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Break Start</p>
                  <p className="text-gray-600 line-through">{formatTimeDisplay(request.originalBreakStartTime)}</p>
                  {request.requestedBreakStartTime && (
                    <p className="text-green-600 font-medium">{formatTimeDisplay(request.requestedBreakStartTime)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Break End</p>
                  <p className="text-gray-600 line-through">{formatTimeDisplay(request.originalBreakEndTime)}</p>
                  {request.requestedBreakEndTime && (
                    <p className="text-green-600 font-medium">{formatTimeDisplay(request.requestedBreakEndTime)}</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Reason:</p>
                <p className="text-sm text-gray-700">{request.reason}</p>
              </div>

              {/* Admin Comments (for processed requests) */}
              {request.status !== 'pending' && request.comments && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-500 mb-1">
                    {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.approverName}:
                  </p>
                  <p className="text-sm text-blue-700">{request.comments}</p>
                </div>
              )}

              {/* Actions (for pending requests) */}
              {request.status === 'pending' && (
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                  {showRejectForm === request.id ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectComments[request.id] || ''}
                        onChange={(e) => setRejectComments(prev => ({
                          ...prev,
                          [request.id]: e.target.value
                        }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                      >
                        {processingId === request.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(null)}
                        className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                      >
                        {processingId === request.id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(request.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
