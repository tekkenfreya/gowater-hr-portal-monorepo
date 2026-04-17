import { Search, X } from 'lucide-react';

interface Props {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const SELECT_STYLE: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.9)',
  backgroundColor: 'rgba(255,255,255,0.05)',
};

const INPUT_CLASS =
  'px-3 py-2 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400';

export default function UnitsFilterBar({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: Props) {
  return (
    <div className="flex items-center space-x-3 mb-4">
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className={INPUT_CLASS}
        style={SELECT_STYLE}
      >
        <option value="">All Statuses</option>
        <option value="registered">Registered</option>
        <option value="dispatched">Dispatched</option>
        <option value="verified">Verified</option>
        <option value="decommissioned">Decommissioned</option>
      </select>

      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
        className={INPUT_CLASS}
        style={SELECT_STYLE}
      >
        <option value="">All Types</option>
        <option value="vending_machine">Vending Machine</option>
        <option value="dispenser">Dispenser</option>
      </select>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
        <input
          type="text"
          placeholder="Search serial number or destination..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-9 pr-3 ${INPUT_CLASS}`}
          style={SELECT_STYLE}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-white/80"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
