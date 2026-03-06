'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { DispatchedUnit, BulkImportRow } from '@/types/units';
import { Plus, Upload, Eye, Printer, Search, X } from 'lucide-react';
import { logger } from '@/lib/logger';

type UnitStatus = 'registered' | 'dispatched' | 'verified' | 'decommissioned';
type UnitType = 'vending_machine' | 'dispenser';

interface CreateUnitForm {
  serialNumber: string;
  unitType: UnitType;
  modelName: string;
  destination: string;
  notes: string;
}

interface BulkImportResult {
  created: number;
  errors: Array<{ row: number; error: string }>;
}

const STATUS_BADGE_CLASSES: Record<UnitStatus, string> = {
  registered: 'bg-gray-100 text-gray-800',
  dispatched: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  decommissioned: 'bg-red-100 text-red-800',
};

const ITEMS_PER_PAGE = 20;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatUnitType(type: string): string {
  return type === 'vending_machine' ? 'Vending Machine' : 'Dispenser';
}

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

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUnitForm>({
    serialNumber: '',
    unitType: 'vending_machine',
    modelName: '',
    destination: '',
    notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Import CSV modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<BulkImportRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState('');

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

  // Create unit handler
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const response = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: createForm.serialNumber,
          unitType: createForm.unitType,
          modelName: createForm.modelName,
          destination: createForm.destination || undefined,
          notes: createForm.notes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateSuccess('Unit created successfully');
        setCreateForm({
          serialNumber: '',
          unitType: 'vending_machine',
          modelName: '',
          destination: '',
          notes: '',
        });
        fetchUnits();
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess('');
        }, 1500);
      } else {
        setCreateError(data.error || 'Failed to create unit');
      }
    } catch {
      setCreateError('Failed to create unit. Please try again.');
    }
    setCreateLoading(false);
  };

  // CSV parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportPreview([]);
    setImportResult(null);
    setImportError('');

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setImportError('CSV must have a header row and at least one data row');
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const serialIdx = headers.indexOf('serial_number');
      const typeIdx = headers.indexOf('unit_type');
      const modelIdx = headers.indexOf('model_name');
      const destIdx = headers.indexOf('destination');
      const notesIdx = headers.indexOf('notes');

      if (serialIdx === -1 || typeIdx === -1 || modelIdx === -1) {
        setImportError('CSV must have columns: serial_number, unit_type, model_name');
        return;
      }

      const rows: BulkImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map((c) => c.trim());
        if (!cols[serialIdx]) continue;
        rows.push({
          serial_number: cols[serialIdx],
          unit_type: cols[typeIdx],
          model_name: cols[modelIdx],
          destination: destIdx !== -1 ? cols[destIdx] : undefined,
          notes: notesIdx !== -1 ? cols[notesIdx] : undefined,
        });
      }

      if (rows.length === 0) {
        setImportError('No valid data rows found in CSV');
        return;
      }

      setImportPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    try {
      const response = await fetch('/api/admin/units/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importPreview }),
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult({ created: data.created, errors: data.errors });
        fetchUnits();
      } else {
        setImportError(data.error || 'Import failed');
      }
    } catch {
      setImportError('Import failed. Please try again.');
    }
    setImportLoading(false);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    setImportResult(null);
    setImportError('');
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-3 max-w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatched Units</h1>
          <p className="text-gray-700">Track and manage all vending machines and dispensers</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="border border-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateError('');
              setCreateSuccess('');
            }}
            className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan transition-all duration-200"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="dispatched">Dispatched</option>
          <option value="verified">Verified</option>
          <option value="decommissioned">Decommissioned</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan transition-all duration-200"
        >
          <option value="">All Types</option>
          <option value="vending_machine">Vending Machine</option>
          <option value="dispenser">Dispenser</option>
        </select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search serial number or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Units Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Units {!loading && <span className="text-sm font-normal text-gray-500">({total} total)</span>}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-800">Loading units...</p>
          </div>
        ) : units.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No units found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Serial Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Dispatched Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 font-mono">{unit.serialNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                      {formatUnitType(unit.unitType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                      {unit.modelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                      {unit.destination || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[unit.status]}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                      {formatDate(unit.dispatchedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/admin/units/${unit.id}`)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => window.open(`/api/admin/units/${unit.id}/label`, '_blank')}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Print barcode label"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} units
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Unit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Unit</h2>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Serial Number</label>
                <input
                  type="text"
                  required
                  value={createForm.serialNumber}
                  onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="GW-VM-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Unit Type</label>
                <select
                  value={createForm.unitType}
                  onChange={(e) => setCreateForm({ ...createForm, unitType: e.target.value as UnitType })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                >
                  <option value="vending_machine">Vending Machine</option>
                  <option value="dispenser">Dispenser</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={createForm.modelName}
                  onChange={(e) => setCreateForm({ ...createForm, modelName: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="AquaFlow 500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Destination</label>
                <input
                  type="text"
                  value={createForm.destination}
                  onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="Manila Office Building A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200 resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                    setCreateSuccess('');
                    setCreateForm({
                      serialNumber: '',
                      unitType: 'vending_machine',
                      modelName: '',
                      destination: '',
                      notes: '',
                    });
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
                >
                  {createLoading ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Import Units from CSV</h2>

            {importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="mb-4 space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                  {importResult.created} unit{importResult.created !== 1 ? 's' : ''} created successfully
                </div>
                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    <p className="font-medium mb-1">{importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!importResult && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required columns: serial_number, unit_type, model_name. Optional: destination, notes
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-800 mb-2">Preview ({importPreview.length} rows)</h3>
                    <div className="overflow-x-auto rounded border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Serial</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Model</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Destination</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {importPreview.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-gray-900 font-mono">{row.serial_number}</td>
                              <td className="px-3 py-2 text-gray-800">{row.unit_type}</td>
                              <td className="px-3 py-2 text-gray-800">{row.model_name}</td>
                              <td className="px-3 py-2 text-gray-800">{row.destination || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.length > 10 && (
                        <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                          ...and {importPreview.length - 10} more rows
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={closeImportModal}
                className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && importPreview.length > 0 && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importLoading}
                  className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
                >
                  {importLoading ? 'Importing...' : `Import ${importPreview.length} Units`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
