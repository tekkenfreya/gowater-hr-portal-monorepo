import { DispatchedUnit } from '@/types/units';
import { Package, Truck, CheckCircle } from 'lucide-react';
import { formatDateTime } from '../_utils/format';

interface Step {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  completed: boolean;
  timestamp: string | null;
  extra?: string | null;
  activeBg: string;
  activeFg: string;
}

export default function UnitTimeline({ unit }: { unit: DispatchedUnit }) {
  const steps: Step[] = [
    {
      label: 'Registered',
      icon: Package,
      completed: true,
      timestamp: unit.createdAt,
      activeBg: 'rgba(125,211,252,0.2)',
      activeFg: '#7dd3fc',
    },
    {
      label: 'Dispatched',
      icon: Truck,
      completed: !!unit.dispatchedAt,
      timestamp: unit.dispatchedAt,
      activeBg: 'rgba(251,191,36,0.2)',
      activeFg: '#fbbf24',
    },
    {
      label: 'Verified',
      icon: CheckCircle,
      completed: !!unit.verifiedAt,
      timestamp: unit.verifiedAt,
      extra: unit.verifiedByName ? `by ${unit.verifiedByName}` : null,
      activeBg: 'rgba(34,197,94,0.2)',
      activeFg: '#86efac',
    },
  ];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-lg font-semibold text-white">Timeline</h2>
      </div>
      <div className="p-6">
        <ol
          className="relative ml-3 space-y-6"
          style={{ borderLeft: '2px solid rgba(255,255,255,0.15)' }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="ml-6">
                <span
                  className="absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: step.completed ? step.activeBg : 'rgba(255,255,255,0.05)',
                    boxShadow: '0 0 0 4px rgba(10,18,30,1)',
                  }}
                >
                  <Icon
                    className="w-3 h-3"
                    style={{
                      color: step.completed ? step.activeFg : 'rgba(255,255,255,0.4)',
                    }}
                  />
                </span>
                <h3
                  className="text-sm font-semibold"
                  style={{
                    color: step.completed ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {step.label}
                </h3>
                {step.completed && step.timestamp ? (
                  <>
                    <time className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {formatDateTime(step.timestamp)}
                    </time>
                    {step.extra && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {step.extra}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Pending
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
