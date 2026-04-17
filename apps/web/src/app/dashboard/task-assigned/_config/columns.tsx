import { ReactNode } from 'react';
import { Lead, Pipeline, Industry } from '@/types/leads';

const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  'water-testing': 'Water Testing',
  'printing-service': 'Printing Service',
  'logistics': 'Logistics',
  'filters': 'Filters',
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  'sarisari-store': 'Sarisari Store',
  'gym': 'Gym',
  'salon': 'Salon / Barbershop',
  'laundry': 'Laundry Shop',
  'internet-cafe': 'Internet Cafe',
  'carinderia': 'Carinderia / Eatery',
  'bakery': 'Bakery',
  'pharmacy': 'Pharmacy',
  'auto-repair': 'Auto Repair / Car Wash',
  'pet-shop': 'Pet Shop',
  'other': 'Other',
};
import StatusBadge from '../_components/StatusBadge';
import RowActions, { RowActionHandlers } from '../_components/RowActions';

export interface LeadColumn {
  header: string;
  tdClassName?: string;
  cell: (lead: Lead) => ReactNode;
}

const TEXT_TD = 'px-2 py-2 text-xs text-white/90';
const NOWRAP_TD = `${TEXT_TD} whitespace-nowrap`;
const TRUNCATE_120 = `${TEXT_TD} max-w-[120px]`;
const TRUNCATE_150 = `${TEXT_TD} max-w-[150px]`;
const NAME_TD = 'px-2 py-2 max-w-[150px]';
const BARE_TD = 'px-2 py-2';

const trunc = (v: string | null | undefined, fallback = 'N/A') => (
  <div className="truncate" title={v || ''}>
    {v || fallback}
  </div>
);

const bold = (v: string | null | undefined) => (
  <div className="font-medium text-white/90 text-xs truncate" title={v || ''}>
    {v || 'N/A'}
  </div>
);

const dateStr = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString() : 'N/A';

export function getLeadColumns(
  h: RowActionHandlers,
  pipeline: Pipeline = 'warm',
  industry: Industry | null = null,
): LeadColumn[] {
  const beneficiaryHeader = industry === 'microfinance' ? 'Members' : '# Beneficiary';
  const entityNameHeader =
    industry === 'restaurants' ? 'Restaurant Name' :
    industry === 'lgu' ? 'LGU Name' :
    industry === 'hotel' ? 'Hotel Name' :
    industry === 'foundation' ? 'Foundation Name' :
    industry === 'property-development' ? 'Property Name' :
    industry === 'hospital' ? 'Hospital Name' :
    industry === 'schools' ? 'School Name' :
    industry === 'offices' ? 'Office Name' :
    industry === 'household' ? 'Customer Name' :
    'Company Name';
  const columns: LeadColumn[] = [
    { header: 'Date Created', tdClassName: NOWRAP_TD, cell: (l) => dateStr(l.created_at) },
    {
      header: 'Type',
      tdClassName: TEXT_TD,
      cell: (l) =>
        industry === 'sme'
          ? (l.business_type ? (BUSINESS_TYPE_LABELS[l.business_type] || l.business_type) : 'N/A')
          : trunc(l.lead_type),
    },
    { header: entityNameHeader, tdClassName: NAME_TD, cell: (l) => bold(l.company_name) },
    { header: beneficiaryHeader, tdClassName: TEXT_TD, cell: (l) => l.number_of_beneficiary || 'N/A' },
    { header: 'Location', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.location) },
    { header: 'Contact', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.contact_person) },
    { header: 'Mobile', tdClassName: TEXT_TD, cell: (l) => l.mobile_number || 'N/A' },
    { header: 'Email', tdClassName: TRUNCATE_150, cell: (l) => trunc(l.email_address) },
    { header: 'Source', tdClassName: TEXT_TD, cell: (l) => l.lead_source || 'N/A' },
    {
      header: 'Product',
      tdClassName: BARE_TD,
      cell: (l) => <span className="text-xs text-white/90 capitalize">{l.product || 'N/A'}</span>,
    },
    { header: 'Status', tdClassName: BARE_TD, cell: (l) => <StatusBadge status={l.status} /> },
    { header: 'Assigned', tdClassName: TEXT_TD, cell: (l) => l.assigned_to || 'Unassigned' },
    { header: 'Disposition', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.disposition, '-') },
    { header: 'Actions', tdClassName: BARE_TD, cell: (l) => <RowActions lead={l} {...h} /> },
  ];

  // Hide Type column for cold pipeline unless industry is SME (which uses the Type column for business_type).
  const hideType = pipeline === 'cold' && industry !== 'sme';
  const hideBeneficiary = industry !== null && [
    'restaurants', 'lgu', 'hotel',
    'property-development', 'hospital', 'offices', 'household',
  ].includes(industry);

  return columns.filter((c) => {
    if (hideType && c.header === 'Type') return false;
    if (hideBeneficiary && c.header === beneficiaryHeader) return false;
    return true;
  });
}

export function getEventColumns(h: RowActionHandlers): LeadColumn[] {
  return [
    { header: 'Date Created', tdClassName: NOWRAP_TD, cell: (l) => dateStr(l.created_at) },
    { header: 'Event Name', tdClassName: NAME_TD, cell: (l) => bold(l.event_name) },
    { header: 'Venue', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.venue) },
    { header: 'Event Date', tdClassName: NOWRAP_TD, cell: (l) => dateStr(l.event_start_date) },
    { header: 'Time', tdClassName: TEXT_TD, cell: (l) => l.event_time || 'N/A' },
    { header: 'Contact', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.contact_person) },
    { header: 'Mobile', tdClassName: TEXT_TD, cell: (l) => l.mobile_number || 'N/A' },
    { header: 'Email', tdClassName: TRUNCATE_150, cell: (l) => trunc(l.email_address) },
    { header: 'Attendees', tdClassName: TEXT_TD, cell: (l) => l.number_of_attendees || 'N/A' },
    {
      header: 'Product',
      tdClassName: BARE_TD,
      cell: (l) => <span className="text-xs text-white/90 capitalize">{l.product || 'N/A'}</span>,
    },
    {
      header: 'Participation',
      tdClassName: TEXT_TD,
      cell: (l) => <span className="capitalize">{l.participation || 'N/A'}</span>,
    },
    { header: 'Status', tdClassName: BARE_TD, cell: (l) => <StatusBadge status={l.status} /> },
    { header: 'Actions', tdClassName: BARE_TD, cell: (l) => <RowActions lead={l} {...h} /> },
  ];
}

export function getSupplierColumns(h: RowActionHandlers): LeadColumn[] {
  return [
    { header: 'Date Created', tdClassName: NOWRAP_TD, cell: (l) => dateStr(l.created_at) },
    { header: 'Supplier Name', tdClassName: NAME_TD, cell: (l) => bold(l.supplier_name) },
    {
      header: 'Category',
      tdClassName: TEXT_TD,
      cell: (l) => l.supplier_category ? (SUPPLIER_CATEGORY_LABELS[l.supplier_category] || l.supplier_category) : 'N/A',
    },
    { header: 'Location', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.supplier_location) },
    { header: 'Product', tdClassName: TEXT_TD, cell: (l) => l.supplier_product || 'N/A' },
    { header: 'Price', tdClassName: TEXT_TD, cell: (l) => l.price || 'N/A' },
    { header: 'Unit', tdClassName: TEXT_TD, cell: (l) => l.unit_type || 'N/A' },
    { header: 'Contact', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.contact_person) },
    { header: 'Mobile', tdClassName: TEXT_TD, cell: (l) => l.mobile_number || 'N/A' },
    { header: 'Email', tdClassName: TRUNCATE_150, cell: (l) => trunc(l.email_address) },
    { header: 'Status', tdClassName: BARE_TD, cell: (l) => <StatusBadge status={l.status} /> },
    { header: 'Actions', tdClassName: BARE_TD, cell: (l) => <RowActions lead={l} {...h} /> },
  ];
}

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  event: 'Event',
  supplier: 'Supplier',
};

const entityName = (l: Lead) => l.company_name || l.event_name || l.supplier_name;

export function getNotInterestedColumns(h: RowActionHandlers): LeadColumn[] {
  return [
    { header: 'Date Created', tdClassName: NOWRAP_TD, cell: (l) => dateStr(l.created_at) },
    { header: 'Type', tdClassName: TEXT_TD, cell: (l) => TYPE_LABELS[l.type] || l.type },
    { header: 'Name', tdClassName: NAME_TD, cell: (l) => bold(entityName(l)) },
    { header: 'Contact', tdClassName: TRUNCATE_120, cell: (l) => trunc(l.contact_person) },
    { header: 'Mobile', tdClassName: TEXT_TD, cell: (l) => l.mobile_number || 'N/A' },
    { header: 'Email', tdClassName: TRUNCATE_150, cell: (l) => trunc(l.email_address) },
    { header: 'Status', tdClassName: BARE_TD, cell: (l) => <StatusBadge status={l.status} /> },
    { header: 'Actions', tdClassName: BARE_TD, cell: (l) => <RowActions lead={l} {...h} /> },
  ];
}
