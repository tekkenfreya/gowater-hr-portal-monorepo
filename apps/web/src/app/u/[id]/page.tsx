'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DispatchedUnit } from '@/types/units';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import UnitInfoCard from '@/app/dashboard/admin/units/_components/UnitInfoCard';

export default function PublicUnitInfoPage() {
  const params = useParams();
  const unitId = params.id as string;

  const [unit, setUnit] = useState<DispatchedUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchUnit() {
      try {
        const response = await fetch(`/api/public/units/${unitId}`);
        if (cancelled) return;
        if (!response.ok) {
          setError(response.status === 404 ? 'Unit not found' : 'Failed to load unit');
          return;
        }
        const data = await response.json();
        if (!cancelled) setUnit(data.unit);
      } catch (err) {
        if (!cancelled) {
          logger.error('Failed to fetch public unit', err);
          setError('Failed to load unit');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (unitId) fetchUnit();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0f1824' }}
    >
      <div className="w-full max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
          </div>
        ) : error || !unit ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{
              border: '1px solid rgba(248,113,113,0.3)',
              backgroundColor: 'rgba(248,113,113,0.1)',
            }}
          >
            <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: '#fca5a5' }} />
            <p style={{ color: '#fca5a5' }}>{error || 'Unit not found'}</p>
          </div>
        ) : (
          <UnitInfoCard unit={unit} />
        )}
      </div>
    </div>
  );
}
