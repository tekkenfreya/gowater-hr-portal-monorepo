'use client';

import { useState } from 'react';
import { BulkImportRow } from '@/types/units';
import { parseCsvLine } from '../_utils/csv';

interface BulkImportResult {
  created: number;
  errors: Array<{ row: number; error: string }>;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportCsvModal({ onClose, onSuccess }: Props) {
  const [preview, setPreview] = useState<BulkImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setPreview([]);
    setResult(null);
    setError('');

    if (!selected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row');
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const serialIdx = headers.indexOf('serial_number');
      const typeIdx = headers.indexOf('unit_type');
      const modelIdx = headers.indexOf('model_name');
      const destIdx = headers.indexOf('destination');
      const notesIdx = headers.indexOf('notes');

      if (serialIdx === -1 || typeIdx === -1 || modelIdx === -1) {
        setError('CSV must have columns: serial_number, unit_type, model_name');
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
        setError('No valid data rows found in CSV');
        return;
      }

      setPreview(rows);
    };
    reader.readAsText(selected);
  };

  const handleSubmit = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/units/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ created: data.created, errors: data.errors });
        onSuccess();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch {
      setError('Import failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Import Units from CSV</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
              {result.created} unit{result.created !== 1 ? 's' : ''} created successfully
            </div>
            {result.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                <p className="font-medium mb-1">
                  {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!result && (
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

            {preview.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  Preview ({preview.length} rows)
                </h3>
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
                      {preview.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-900 font-mono">{row.serial_number}</td>
                          <td className="px-3 py-2 text-gray-800">{row.unit_type}</td>
                          <td className="px-3 py-2 text-gray-800">{row.model_name}</td>
                          <td className="px-3 py-2 text-gray-800">{row.destination || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                      ...and {preview.length - 10} more rows
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
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && preview.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
            >
              {loading ? 'Importing...' : `Import ${preview.length} Units`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
