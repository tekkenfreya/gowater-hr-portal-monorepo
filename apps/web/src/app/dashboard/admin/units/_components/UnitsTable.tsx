import { DispatchedUnit } from '@/types/units';
import { Eye, Printer } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate, formatUnitType } from '../_utils/format';

interface Props {
  units: DispatchedUnit[];
  total: number;
  loading: boolean;
  page: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onView: (unit: DispatchedUnit) => void;
  onPrintLabel: (unit: DispatchedUnit) => void;
}

const TH_CLASS =
  'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap';
const TH_STYLE = { color: 'rgba(255,255,255,0.4)' };

const TD_CLASS = 'px-6 py-4 whitespace-nowrap text-sm text-white/90';

export default function UnitsTable({
  units,
  total,
  loading,
  page,
  totalPages,
  itemsPerPage,
  onPageChange,
  onView,
  onPrintLabel,
}: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-lg font-semibold text-white">
          Units{' '}
          {!loading && (
            <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ({total} total)
            </span>
          )}
        </h2>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Loading units...
          </p>
        </div>
      ) : units.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
            No units found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <tr>
                <th className={TH_CLASS} style={TH_STYLE}>Serial Number</th>
                <th className={TH_CLASS} style={TH_STYLE}>Type</th>
                <th className={TH_CLASS} style={TH_STYLE}>Model</th>
                <th className={TH_CLASS} style={TH_STYLE}>Destination</th>
                <th className={TH_CLASS} style={TH_STYLE}>Status</th>
                <th className={TH_CLASS} style={TH_STYLE}>Dispatched Date</th>
                <th
                  className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={TH_STYLE}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-white/5 transition-colors duration-100">
                  <td className={TD_CLASS}>
                    <span className="font-medium text-white font-mono">{unit.serialNumber}</span>
                  </td>
                  <td className={TD_CLASS}>{formatUnitType(unit.unitType)}</td>
                  <td className={TD_CLASS}>{unit.modelName}</td>
                  <td className={TD_CLASS}>{unit.destination || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={unit.status} />
                  </td>
                  <td className={TD_CLASS}>{formatDate(unit.dispatchedAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(unit)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onPrintLabel(unit)}
                        className="transition-colors hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.6)' }}
                        title="Print QR label"
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

      {totalPages > 1 && (
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of{' '}
            {total} units
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
