type UnitStatus = 'registered' | 'dispatched' | 'verified' | 'decommissioned';

type StatusStyle = { bg: string; text: string; border: string };

const STATUS_STYLES: Record<UnitStatus, StatusStyle> = {
  registered: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.15)' },
  dispatched: { bg: 'rgba(125,211,252,0.15)', text: '#7dd3fc', border: 'rgba(125,211,252,0.3)' },
  verified: { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  decommissioned: { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', border: 'rgba(248,113,113,0.3)' },
};

const DEFAULT_STYLE: StatusStyle = STATUS_STYLES.registered;

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status as UnitStatus] || DEFAULT_STYLE;
  return (
    <span
      className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
}
