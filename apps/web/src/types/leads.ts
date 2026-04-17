export type LeadType = 'lead' | 'event' | 'supplier';
export type Pipeline = 'warm' | 'cold' | 'hot';
export type Industry = 'restaurants' | 'lgu' | 'hotel' | 'microfinance' | 'foundation';
export type ProductType = 'both' | 'vending' | 'dispenser';
export type ActivityType = 'call' | 'email' | 'meeting' | 'site-visit' | 'follow-up' | 'remark' | 'other' | 'active-supplier' | 'recording' | 'checking';

// Legacy alias — remove callers over time
export type LeadCategory = LeadType;
export type ColdCategory = Industry;

export interface Lead {
  id: string;
  type: LeadType;
  pipeline: Pipeline;
  industry: Industry | null;

  // LEAD-SPECIFIC FIELDS (used when type = 'lead')
  lead_type: string | null;
  company_name: string | null;
  number_of_beneficiary: string | null;
  location: string | null;
  lead_source: string | null;

  // EVENT-SPECIFIC FIELDS (used when type = 'event')
  event_name: string | null;
  event_type: string | null;
  venue: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_time: string | null;
  event_lead: string | null;
  number_of_attendees: string | null;
  event_report: string | null;

  // SUPPLIER-SPECIFIC FIELDS (used when type = 'supplier')
  supplier_name: string | null;
  supplier_location: string | null;
  supplier_product: string | null;
  price: string | null;
  unit_type: string | null;

  // EVENT PARTICIPATION (event-only, null otherwise)
  participation: string | null;

  // SHARED FIELDS
  contact_person: string | null;
  mobile_number: string | null;
  email_address: string | null;
  product: ProductType | null;
  status: string;
  remarks: string | null;
  disposition: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  employee_name: string;
  activity_type: ActivityType;
  activity_description: string;
  start_date: string | null;
  end_date: string | null;
  status_update: string | null;
  created_at: string;
}

export interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
  activity_count: number;
  last_activity?: LeadActivity;
}

export interface LeadFormData {
  type: LeadType;
  pipeline?: Pipeline;
  industry?: Industry;

  // LEAD-SPECIFIC
  lead_type?: string;
  company_name?: string;
  number_of_beneficiary?: string;
  location?: string;
  lead_source?: string;

  // EVENT-SPECIFIC
  event_name?: string;
  event_type?: string;
  venue?: string;
  event_start_date?: string;
  event_end_date?: string;
  event_time?: string;
  event_lead?: string;
  number_of_attendees?: string;
  event_report?: string;

  // SUPPLIER-SPECIFIC
  supplier_name?: string;
  supplier_location?: string;
  supplier_product?: string;
  price?: string;
  unit_type?: string;

  // EVENT PARTICIPATION
  participation?: string;

  // SHARED
  contact_person?: string;
  mobile_number?: string;
  email_address?: string;
  product?: ProductType;
  status?: string;
  remarks?: string;
  disposition?: string;
  assigned_to?: string;
}

export interface ActivityFormData {
  activity_type: ActivityType;
  activity_description: string;
  start_date?: string;
  end_date?: string;
  status_update?: string;
}

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  total_activities: number;
  activities_today: number;
  closed_deals: number;
  by_category: {
    category: LeadType;
    count: number;
    percentage: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  employee_activities: {
    employee_name: string;
    total_activities: number;
    calls: number;
    emails: number;
    meetings: number;
    site_visits: number;
    leads_assigned: number;
  }[];
  recent_activities: (LeadActivity & { company_name: string; category: LeadType })[];
  stale_leads: LeadWithActivities[];
}
