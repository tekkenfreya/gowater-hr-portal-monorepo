import { Lead } from '@/types/leads';
import { Plus } from 'lucide-react';
import { LeadColumn } from '../_config/columns';

interface Props {
  columns: LeadColumn[];
  leads: Lead[];
  loading: boolean;
  categoryLabel: string;
  singularLabel: string;
  onAdd: () => void;
}

const TH_CLASS =
  'px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap';
const TH_STYLE = { color: 'rgba(255,255,255,0.4)' };

function AddCircleButton({ onAdd, singularLabel }: { onAdd: () => void; singularLabel: string }) {
  return (
    <button
      onClick={onAdd}
      className="w-8 h-8 rounded-full transition-colors duration-150 flex items-center justify-center group hover:bg-white/10"
      style={{
        border: '1px solid rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}
      title={`Add ${singularLabel}`}
    >
      <Plus className="w-4 h-4 text-cyan-400" />
    </button>
  );
}

export default function LeadsTable({
  columns,
  leads,
  loading,
  categoryLabel,
  singularLabel,
  onAdd,
}: Props) {
  return (
    <div
      className="rounded-lg overflow-x-auto"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Loading {categoryLabel.toLowerCase()}...
          </p>
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-base mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            No {categoryLabel.toLowerCase()} found
          </p>
          <div className="mx-auto w-8">
            <AddCircleButton onAdd={onAdd} singularLabel={singularLabel} />
          </div>
        </div>
      ) : (
        <table className="table-auto" style={{ minWidth: '1800px', width: '1800px' }}>
          <thead
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={TH_CLASS} style={TH_STYLE}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5 transition-colors duration-100">
                {columns.map((c) => (
                  <td key={c.header} className={c.tdClassName}>
                    {c.cell(lead)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && leads.length > 0 && (
        <div className="mt-3 flex justify-center">
          <AddCircleButton onAdd={onAdd} singularLabel={singularLabel} />
        </div>
      )}
    </div>
  );
}
