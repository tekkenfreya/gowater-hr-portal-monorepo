import { ServiceRequest } from '@/types/units';
import { Package } from 'lucide-react';
import ServiceRequestStatusBadge from './ServiceRequestStatusBadge';
import { formatDateTime } from '../_utils/format';

const TH_CLASS =
  'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap';
const TH_STYLE = { color: 'rgba(255,255,255,0.4)' };
const TD_CLASS = 'px-6 py-4 text-sm text-white/90';

export default function ServiceRequestsTable({ requests }: { requests: ServiceRequest[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-lg font-semibold text-white">Service Requests</h2>
      </div>
      {requests.length === 0 ? (
        <div className="p-6 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p>No service requests for this unit</p>
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
                <th className={TH_CLASS} style={TH_STYLE}>Customer</th>
                <th className={TH_CLASS} style={TH_STYLE}>Contact</th>
                <th className={TH_CLASS} style={TH_STYLE}>Issue</th>
                <th className={TH_CLASS} style={TH_STYLE}>Status</th>
                <th className={TH_CLASS} style={TH_STYLE}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-white/5 transition-colors duration-100">
                  <td className={`${TD_CLASS} whitespace-nowrap text-white`}>{req.customerName}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{req.contactNumber}</td>
                  <td className={`${TD_CLASS} max-w-xs truncate`}>{req.issueDescription}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ServiceRequestStatusBadge status={req.status} />
                  </td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDateTime(req.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
