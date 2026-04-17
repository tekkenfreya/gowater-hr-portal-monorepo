'use client';

import { useState } from 'react';
import { DispatchedUnit } from '@/types/units';
import { logger } from '@/lib/logger';

const ALLOWED_TRANSITIONS: Record<DispatchedUnit['status'], DispatchedUnit['status'][]> = {
  registered: ['dispatched', 'decommissioned'],
  dispatched: ['verified', 'decommissioned'],
  verified: ['decommissioned'],
  decommissioned: [],
};

interface EditFormData {
  modelName: string;
  destination: string;
  notes: string;
  status: DispatchedUnit['status'];
}

interface Props {
  unit: DispatchedUnit;
  onClose: () => void;
  onUpdated: (unit: DispatchedUnit) => void;
}

export default function EditUnitModal({ unit, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<EditFormData>({
    modelName: unit.modelName,
    destination: unit.destination || '',
    notes: unit.notes || '',
    status: unit.status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body: Record<string, string> = {};
      if (form.modelName !== unit.modelName) body.modelName = form.modelName;
      if (form.destination !== (unit.destination || '')) body.destination = form.destination;
      if (form.notes !== (unit.notes || '')) body.notes = form.notes;
      if (form.status !== unit.status) body.status = form.status;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const response = await fetch(`/api/admin/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update unit');
        return;
      }

      onUpdated(data.unit);
      onClose();
    } catch (err) {
      logger.error('Failed to update unit', err);
      setError('Failed to update unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Unit: {unit.serialNumber}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Model Name</label>
            <input
              type="text"
              required
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Destination</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
              placeholder="e.g. Cebu City, SM Mall"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200 resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as DispatchedUnit['status'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
            >
              <option value={unit.status} className="capitalize">{unit.status}</option>
              {ALLOWED_TRANSITIONS[unit.status].map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
