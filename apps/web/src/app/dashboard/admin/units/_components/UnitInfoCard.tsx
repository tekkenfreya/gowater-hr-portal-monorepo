import { DispatchedUnit } from '@/types/units';
import StatusBadge from './StatusBadge';
import { formatDateTime, formatUnitType } from '../_utils/format';

const LABEL_STYLE = { color: 'rgba(255,255,255,0.4)' };
const VALUE_CLASS = 'mt-1 text-sm text-white/90';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide" style={LABEL_STYLE}>
        {label}
      </dt>
      <dd className={VALUE_CLASS}>{children}</dd>
    </div>
  );
}

export default function UnitInfoCard({ unit }: { unit: DispatchedUnit }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-lg font-semibold text-white">Unit Information</h2>
      </div>
      <div className="p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Serial Number">
            <span className="font-mono">{unit.serialNumber}</span>
          </Field>
          <Field label="Type">{formatUnitType(unit.unitType)}</Field>
          <Field label="Model">{unit.modelName}</Field>
          <Field label="Destination">{unit.destination || '-'}</Field>
          <Field label="Status">
            <StatusBadge status={unit.status} />
          </Field>
          <Field label="Created">{formatDateTime(unit.createdAt)}</Field>
          <Field label="Dispatched">{formatDateTime(unit.dispatchedAt)}</Field>
          <Field label="Verified">{formatDateTime(unit.verifiedAt)}</Field>
          {unit.verifiedByName && <Field label="Verified By">{unit.verifiedByName}</Field>}
          {unit.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide" style={LABEL_STYLE}>
                Notes
              </dt>
              <dd className={`${VALUE_CLASS} whitespace-pre-wrap`}>{unit.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
