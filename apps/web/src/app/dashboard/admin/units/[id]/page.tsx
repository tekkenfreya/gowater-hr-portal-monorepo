'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { DispatchedUnit, ServiceRequest } from '@/types/units';
import { ArrowLeft, Edit, Printer, Truck, Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface EditFormData {
  modelName: string;
  destination: string;
  notes: string;
  status: DispatchedUnit['status'];
}

interface UnitDetailResponse {
  success: boolean;
  unit: DispatchedUnit;
  serviceRequests: ServiceRequest[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUnitType(type: DispatchedUnit['unitType']): string {
  return type === 'vending_machine' ? 'Vending Machine' : 'Dispenser';
}

function StatusBadge({ status }: { status: DispatchedUnit['status'] }) {
  const styles: Record<DispatchedUnit['status'], string> = {
    registered: 'bg-blue-100 text-blue-800',
    dispatched: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    decommissioned: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function ServiceRequestStatusBadge({ status }: { status: ServiceRequest['status'] }) {
  const styles: Record<ServiceRequest['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
  };

  const labels: Record<ServiceRequest['status'], string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function UnitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const unitId = params.id as string;

  const [unit, setUnit] = useState<DispatchedUnit | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    modelName: '',
    destination: '',
    notes: '',
    status: 'registered',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [labelSvg, setLabelSvg] = useState('');
  const [labelLoading, setLabelLoading] = useState(false);

  const fetchUnit = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/units/${unitId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Unit not found');
        } else {
          setError('Failed to load unit');
        }
        return;
      }
      const data: UnitDetailResponse = await response.json();
      setUnit(data.unit);
      setServiceRequests(data.serviceRequests);
    } catch (err) {
      logger.error('Failed to fetch unit', err);
      setError('Failed to load unit');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  const fetchLabel = useCallback(async () => {
    setLabelLoading(true);
    try {
      const response = await fetch(`/api/admin/units/${unitId}/label`);
      if (response.ok) {
        const contentType = response.headers.get('Content-Type') ?? '';
        if (!contentType.includes('image/svg+xml')) {
          return;
        }
        const svg = await response.text();
        setLabelSvg(svg);
      }
    } catch (err) {
      logger.error('Failed to fetch label', err);
    } finally {
      setLabelLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (unitId) {
      fetchUnit();
      fetchLabel();
    }
  }, [user, router, unitId, fetchUnit, fetchLabel]);

  const openEditModal = useCallback(() => {
    if (!unit) return;
    setEditForm({
      modelName: unit.modelName,
      destination: unit.destination || '',
      notes: unit.notes || '',
      status: unit.status,
    });
    setEditError('');
    setShowEditModal(true);
  }, [unit]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      const body: Record<string, string> = {};
      if (editForm.modelName !== unit?.modelName) body.modelName = editForm.modelName;
      if (editForm.destination !== (unit?.destination || '')) body.destination = editForm.destination;
      if (editForm.notes !== (unit?.notes || '')) body.notes = editForm.notes;
      if (editForm.status !== unit?.status) body.status = editForm.status;

      if (Object.keys(body).length === 0) {
        setShowEditModal(false);
        return;
      }

      const response = await fetch(`/api/admin/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || 'Failed to update unit');
        return;
      }

      setUnit(data.unit);
      setShowEditModal(false);
    } catch (err) {
      logger.error('Failed to update unit', err);
      setEditError('Failed to update unit');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!unit || unit.status !== 'registered') return;
    if (!confirm('Mark this unit as dispatched?')) return;

    try {
      const response = await fetch(`/api/admin/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dispatched' }),
      });

      const data = await response.json();
      if (response.ok) {
        setUnit(data.unit);
      }
    } catch (err) {
      logger.error('Failed to dispatch unit', err);
    }
  };

  const handlePrintLabel = () => {
    if (!labelSvg) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Print Label</title>
  <style>
    @media print { body { margin: 0; padding: 0; } .label-container { width: 300px; height: 200px; } }
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .label-container { width: 300px; height: 200px; }
    .label-container svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div class="label-container">${labelSvg}</div>
  <script>window.onload = function() { window.print(); window.close(); }<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'width=400,height=300');
    if (printWindow) {
      printWindow.onafterprint = () => URL.revokeObjectURL(url);
    } else {
      URL.revokeObjectURL(url);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="p-3 max-w-full">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-800">Loading unit details...</p>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="p-3 max-w-full">
        <div className="flex items-center space-x-3 mb-6">
          <Link href="/dashboard/admin/units" className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Unit Not Found</h1>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-700">{error || 'Unit not found'}</p>
          <Link
            href="/dashboard/admin/units"
            className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Back to Units
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/admin/units" className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Unit: {unit.serialNumber}</h1>
              <StatusBadge status={unit.status} />
            </div>
            <p className="text-gray-700">{formatUnitType(unit.unitType)} &middot; {unit.modelName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={openEditModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handlePrintLabel}
            disabled={!labelSvg}
            className="inline-flex items-center space-x-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
          {unit.status === 'registered' && (
            <button
              onClick={handleDispatch}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-p3-cyan text-p3-navy-darkest rounded-lg text-sm font-bold hover:bg-p3-cyan-dark shadow-md transition-all"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Unit Info + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Info Card */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Unit Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{unit.serialNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatUnitType(unit.unitType)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Model</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.modelName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Destination</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.destination || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1"><StatusBadge status={unit.status} /></dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(unit.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dispatched</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(unit.dispatchedAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Verified</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(unit.verifiedAt)}</dd>
                </div>
                {unit.verifiedByName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Verified By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{unit.verifiedByName}</dd>
                  </div>
                )}
                {unit.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{unit.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Service Requests Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Service Requests</h2>
            </div>
            {serviceRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No service requests for this unit</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Issue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{req.contactNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate">{req.issueDescription}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><ServiceRequestStatusBadge status={req.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatDate(req.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Barcode Label + Timeline */}
        <div className="space-y-6">
          {/* Barcode Label */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Barcode Label</h2>
            </div>
            <div className="p-6 flex flex-col items-center">
              {labelLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : labelSvg ? (
                <>
                  <div
                    className="border border-gray-100 rounded-lg p-2 bg-white"
                    dangerouslySetInnerHTML={{ __html: labelSvg }}
                  />
                  <button
                    onClick={handlePrintLabel}
                    className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-p3-cyan text-p3-navy-darkest rounded-lg text-sm font-bold hover:bg-p3-cyan-dark shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Label</span>
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-sm py-4">Failed to load label</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
            </div>
            <div className="p-6">
              <ol className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {/* Created */}
                <li className="ml-6">
                  <span className="absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 ring-4 ring-white">
                    <Package className="w-3 h-3 text-blue-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">Registered</h3>
                  <time className="text-xs text-gray-500">{formatDate(unit.createdAt)}</time>
                </li>

                {/* Dispatched */}
                <li className="ml-6">
                  <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
                    unit.dispatchedAt ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Truck className={`w-3 h-3 ${unit.dispatchedAt ? 'text-yellow-600' : 'text-gray-400'}`} />
                  </span>
                  <h3 className={`text-sm font-semibold ${unit.dispatchedAt ? 'text-gray-900' : 'text-gray-400'}`}>Dispatched</h3>
                  {unit.dispatchedAt ? (
                    <time className="text-xs text-gray-500">{formatDate(unit.dispatchedAt)}</time>
                  ) : (
                    <p className="text-xs text-gray-400">Pending</p>
                  )}
                </li>

                {/* Verified */}
                <li className="ml-6">
                  <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
                    unit.verifiedAt ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <CheckCircle className={`w-3 h-3 ${unit.verifiedAt ? 'text-green-600' : 'text-gray-400'}`} />
                  </span>
                  <h3 className={`text-sm font-semibold ${unit.verifiedAt ? 'text-gray-900' : 'text-gray-400'}`}>Verified</h3>
                  {unit.verifiedAt ? (
                    <>
                      <time className="text-xs text-gray-500">{formatDate(unit.verifiedAt)}</time>
                      {unit.verifiedByName && (
                        <p className="text-xs text-gray-500">by {unit.verifiedByName}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Pending</p>
                  )}
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Unit: {unit.serialNumber}</h2>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={editForm.modelName}
                  onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Destination</label>
                <input
                  type="text"
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="e.g. Cebu City, SM Mall"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200 resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DispatchedUnit['status'] })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                >
                  <option value="registered">Registered</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="verified">Verified</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
