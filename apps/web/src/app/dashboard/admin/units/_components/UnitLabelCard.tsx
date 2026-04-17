import { Printer } from 'lucide-react';

interface Props {
  labelSvg: string;
  loading: boolean;
  onPrint: () => void;
}

export default function UnitLabelCard({ labelSvg, loading, onPrint }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-lg font-semibold text-white">QR Code</h2>
      </div>
      <div className="p-6 flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
          </div>
        ) : labelSvg ? (
          <>
            <div
              className="rounded-lg p-3 bg-white"
              dangerouslySetInnerHTML={{ __html: labelSvg }}
            />
            <button
              onClick={onPrint}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-p3-cyan text-p3-navy-darkest rounded-lg text-sm font-bold hover:bg-p3-cyan-dark shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Label</span>
            </button>
          </>
        ) : (
          <p className="text-sm py-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Failed to load label
          </p>
        )}
      </div>
    </div>
  );
}
