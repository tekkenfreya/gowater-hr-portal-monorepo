'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { ServiceRequest } from '@/types/units';
import { Search, ChevronDown, ChevronUp, Wrench, CheckCircle } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved';

function getStatusBadgeClasses(status: ServiceRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
  }
}

function getStatusLabel(status: ServiceRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export default function ServiceRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/admin/service-requests?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleStatusUpdate = async (requestId: number, newStatus: 'in_progress' | 'resolved') => {
    const label = newStatus === 'in_progress' ? 'In Progress' : 'Resolved';
    if (!confirm(`Are you sure you want to mark this request as "${label}"?`)) {
      return;
    }

    setUpdatingId(requestId);
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchRequests();
      }
    } catch {
      // Silently handle update errors
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-3 max-w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-700">
            {total} total request{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
        </div>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Service Requests</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-800">Loading service requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No service requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Unit Serial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <Fragment key={req.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(req.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{req.customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                        <div>{req.contactNumber}</div>
                        {req.email && (
                          <div className="text-sm text-gray-500">{req.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-mono text-sm">
                        {req.unit?.serialNumber || `Unit #${req.unitId}`}
                      </td>
                      <td className="px-6 py-4 text-gray-800 max-w-xs">
                        <div className="flex items-center gap-1">
                          <span>{truncateText(req.issueDescription, 50)}</span>
                          {expandedId === req.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(req.status)}`}
                        >
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 text-sm">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'in_progress')}
                              disabled={updatingId === req.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
                              title="Mark In Progress"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>{updatingId === req.id ? 'Updating...' : 'In Progress'}</span>
                            </button>
                          )}
                          {req.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'resolved')}
                              disabled={updatingId === req.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                              title="Mark Resolved"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{updatingId === req.id ? 'Updating...' : 'Resolve'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedId === req.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                Full Issue Description
                              </h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {req.issueDescription}
                              </p>
                            </div>
                            {req.unit && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  Unit Details
                                </h4>
                                <div className="space-y-1 text-sm text-gray-700">
                                  <p>
                                    <span className="font-medium">Serial:</span>{' '}
                                    {req.unit.serialNumber}
                                  </p>
                                  <p>
                                    <span className="font-medium">Type:</span>{' '}
                                    {req.unit.unitType === 'vending_machine'
                                      ? 'Vending Machine'
                                      : 'Dispenser'}
                                  </p>
                                  <p>
                                    <span className="font-medium">Model:</span>{' '}
                                    {req.unit.modelName}
                                  </p>
                                  <p>
                                    <span className="font-medium">Status:</span>{' '}
                                    {req.unit.status}
                                  </p>
                                  {req.unit.destination && (
                                    <p>
                                      <span className="font-medium">Destination:</span>{' '}
                                      {req.unit.destination}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {req.resolvedAt && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  Resolution
                                </h4>
                                <p className="text-sm text-gray-700">
                                  Resolved on {formatDate(req.resolvedAt)}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
