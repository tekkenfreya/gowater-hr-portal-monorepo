import { ServiceRequest } from '@/types/units';

const STYLES: Record<ServiceRequest['status'], { bg: string; text: string; border: string; label: string }> = {
  pending: {
    bg: 'rgba(251,191,36,0.15)',
    text: '#fbbf24',
    border: 'rgba(251,191,36,0.3)',
    label: 'Pending',
  },
  in_progress: {
    bg: 'rgba(125,211,252,0.15)',
    text: '#7dd3fc',
    border: 'rgba(125,211,252,0.3)',
    label: 'In Progress',
  },
  resolved: {
    bg: 'rgba(34,197,94,0.15)',
    text: '#86efac',
    border: 'rgba(34,197,94,0.3)',
    label: 'Resolved',
  },
};

export default function ServiceRequestStatusBadge({ status }: { status: ServiceRequest['status'] }) {
  const s = STYLES[status];
  return (
    <span
      className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}
