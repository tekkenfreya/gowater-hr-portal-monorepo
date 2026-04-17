'use client';

import { useState } from 'react';

type UnitType = 'vending_machine' | 'dispenser';

interface CreateUnitForm {
  serialNumber: string;
  unitType: UnitType;
  modelName: string;
  destination: string;
  notes: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: CreateUnitForm = {
  serialNumber: '',
  unitType: 'vending_machine',
  modelName: '',
  destination: '',
  notes: '',
};

export default function CreateUnitModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<CreateUnitForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: form.serialNumber,
          unitType: form.unitType,
          modelName: form.modelName,
          destination: form.destination || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Unit created successfully');
        setForm(INITIAL_FORM);
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to create unit');
      }
    } catch {
      setError('Failed to create unit. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Unit</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Serial Number</label>
            <input
              type="text"
              required
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
              placeholder="GW-VM-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Unit Type</label>
            <select
              value={form.unitType}
              onChange={(e) => setForm({ ...form, unitType: e.target.value as UnitType })}
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
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
              placeholder="AquaFlow 500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Destination</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
              placeholder="Manila Office Building A"
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
              {loading ? 'Creating...' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
