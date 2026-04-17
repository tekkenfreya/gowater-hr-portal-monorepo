'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { DispatchedUnit, ServiceRequest } from '@/types/units';
import { ArrowLeft, Edit, Printer, Truck, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import StatusBadge from '../_components/StatusBadge';
import UnitInfoCard from '../_components/UnitInfoCard';
import UnitTimeline from '../_components/UnitTimeline';
import UnitLabelCard from '../_components/UnitLabelCard';
import ServiceRequestsTable from '../_components/ServiceRequestsTable';
import EditUnitModal from '../_components/EditUnitModal';
import { formatUnitType } from '../_utils/format';

interface UnitDetailResponse {
  success: boolean;
  unit: DispatchedUnit;
  serviceRequests: ServiceRequest[];
}

const SECONDARY_BTN_STYLE: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.9)',
};

const DANGER_BTN_STYLE: React.CSSProperties = {
  border: '1px solid rgba(248,113,113,0.3)',
  backgroundColor: 'rgba(248,113,113,0.1)',
  color: '#fca5a5',
};

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
      const response = await fetch(`/api/admin/units/${unitId}/label?v=qr4`);
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

  const handleDelete = async () => {
    if (!unit || unit.status !== 'registered') return;
    if (!confirm('Are you sure you want to delete this unit? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/units/${unitId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        router.push('/dashboard/admin/units');
      } else {
        setError(data.error || 'Failed to delete unit');
      }
    } catch (err) {
      logger.error('Failed to delete unit', err);
      setError('Failed to delete unit');
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="ml-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Loading unit details...</p>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="p-3 max-w-full">
        <div className="flex items-center space-x-3 mb-6">
          <Link
            href="/dashboard/admin/units"
            className="transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Unit Not Found</h1>
        </div>
        <div
          className="rounded-lg p-6 text-center"
          style={{
            border: '1px solid rgba(248,113,113,0.3)',
            backgroundColor: 'rgba(248,113,113,0.1)',
          }}
        >
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: '#fca5a5' }} />
          <p style={{ color: '#fca5a5' }}>{error || 'Unit not found'}</p>
          <Link
            href="/dashboard/admin/units"
            className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300 underline"
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
          <Link
            href="/dashboard/admin/units"
            className="transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">Unit: {unit.serialNumber}</h1>
              <StatusBadge status={unit.status} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {formatUnitType(unit.unitType)} &middot; {unit.modelName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {unit.status !== 'decommissioned' && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
              style={SECONDARY_BTN_STYLE}
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={handlePrintLabel}
            disabled={!labelSvg}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            style={SECONDARY_BTN_STYLE}
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
          {unit.status === 'registered' && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
              style={DANGER_BTN_STYLE}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <UnitInfoCard unit={unit} />
          <ServiceRequestsTable requests={serviceRequests} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <UnitLabelCard labelSvg={labelSvg} loading={labelLoading} onPrint={handlePrintLabel} />
          <UnitTimeline unit={unit} />
        </div>
      </div>

      {showEditModal && (
        <EditUnitModal
          unit={unit}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => setUnit(updated)}
        />
      )}
    </div>
  );
}
