'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { DispatchedUnit } from '@/types/units';
import { Plus, Upload } from 'lucide-react';
import { logger } from '@/lib/logger';
import UnitsFilterBar from './_components/UnitsFilterBar';
import UnitsTable from './_components/UnitsTable';
import CreateUnitModal from './_components/CreateUnitModal';
import ImportCsvModal from './_components/ImportCsvModal';

const ITEMS_PER_PAGE = 20;

export default function DispatchedUnitsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [units, setUnits] = useState<DispatchedUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await fetch(`/api/admin/units?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units);
        setTotal(data.total);
      }
    } catch (error) {
      logger.error('Failed to fetch units', error);
    }
    setLoading(false);
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchUnits();
  }, [user, router, fetchUnits]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-3 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispatched Units</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Track and manage all vending machines and dispensers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-colors duration-150 flex items-center space-x-2 hover:bg-white/10"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <Upload className="w-5 h-5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      <UnitsFilterBar
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        typeFilter={typeFilter}
        onTypeChange={(v) => {
          setTypeFilter(v);
          setPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <UnitsTable
        units={units}
        total={total}
        loading={loading}
        page={page}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setPage}
        onView={(unit) => router.push(`/dashboard/admin/units/${unit.id}`)}
        onPrintLabel={(unit) => window.open(`/api/admin/units/${unit.id}/label`, '_blank')}
      />

      {showCreateModal && (
        <CreateUnitModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUnits}
        />
      )}

      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchUnits}
        />
      )}
    </div>
  );
}
