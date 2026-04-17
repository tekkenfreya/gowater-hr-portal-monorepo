type StatusStyle = { bg: string; text: string; border: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
  // lead / supplier
  'not-started': { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.15)' },
  'contacted': { bg: 'rgba(125,211,252,0.15)', text: '#7dd3fc', border: 'rgba(125,211,252,0.3)' },
  'quoted': { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  'negotiating': { bg: 'rgba(192,132,252,0.15)', text: '#c084fc', border: 'rgba(192,132,252,0.3)' },
  'closed-deal': { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  'rejected': { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', border: 'rgba(248,113,113,0.3)' },
  // event
  'pending': { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  'confirmed': { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  'cancelled': { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', border: 'rgba(248,113,113,0.3)' },
  'attended': { bg: 'rgba(125,211,252,0.15)', text: '#7dd3fc', border: 'rgba(125,211,252,0.3)' },
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  bg: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.15)',
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
  return (
    <span
      className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status.replace('-', ' ')}
    </span>
  );
}
