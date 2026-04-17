import { Lead } from '@/types/leads';
import { FileText, Eye, Pencil, Trash2, Archive, RotateCcw } from 'lucide-react';

export interface RowActionHandlers {
  onLog: (lead: Lead) => void;
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onToggleArchive: (lead: Lead) => void;
}

const SECONDARY_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.15)',
};

const DANGER_STYLE = {
  backgroundColor: 'rgba(248,113,113,0.1)',
  color: '#fca5a5',
  border: '1px solid rgba(248,113,113,0.3)',
};

export default function RowActions({
  lead,
  onLog,
  onView,
  onEdit,
  onDelete,
  onToggleArchive,
}: { lead: Lead } & RowActionHandlers) {
  const isArchived = lead.not_interested;
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => onLog(lead)}
        className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1 shadow-[0_0_8px_rgba(0,120,212,0.3)]"
      >
        <FileText className="w-3 h-3" />
        Log
      </button>
      <button
        onClick={() => onView(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10"
        style={SECONDARY_STYLE}
      >
        <Eye className="w-3 h-3" />
        View
      </button>
      <button
        onClick={() => onEdit(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10"
        style={SECONDARY_STYLE}
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>
      <button
        onClick={() => onToggleArchive(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10"
        style={SECONDARY_STYLE}
        title={isArchived ? 'Restore to original view' : 'Move to Not Interested'}
      >
        {isArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
        {isArchived ? 'Restore' : 'Archive'}
      </button>
      <button
        onClick={() => onDelete(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-red-500/20"
        style={DANGER_STYLE}
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  );
}
