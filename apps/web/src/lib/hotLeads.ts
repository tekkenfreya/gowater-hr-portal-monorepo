import { getDb } from './supabase';
import { Lead, LeadActivity, LeadFormData, ActivityFormData, LeadWithActivities, LeadCategory } from '@/types/leads';
import { randomUUID } from 'crypto';
import { logger } from './logger';

export class HotLeadService {
  private db = getDb();

  // ============ LEAD MANAGEMENT ============

  async createLead(employeeName: string, leadData: LeadFormData): Promise<Lead> {
    const now = new Date().toISOString();

    const lead: Lead = {
      id: randomUUID(),
      category: leadData.category,

      // LEAD-SPECIFIC FIELDS
      date_of_interaction: leadData.category === 'lead' ? leadData.date_of_interaction || null : null,
      lead_type: leadData.category === 'lead' ? leadData.lead_type || null : null,
      company_name: leadData.category === 'lead' ? leadData.company_name || null : null,
      number_of_beneficiary: leadData.category === 'lead' ? leadData.number_of_beneficiary || null : null,
      location: leadData.category === 'lead' ? leadData.location || null : null,
      lead_source: leadData.category === 'lead' ? leadData.lead_source || null : null,

      // EVENT-SPECIFIC FIELDS
      event_name: leadData.category === 'event' ? leadData.event_name || null : null,
      event_type: leadData.category === 'event' ? leadData.event_type || null : null,
      venue: leadData.category === 'event' ? leadData.venue || null : null,
      event_date: leadData.category === 'event' ? leadData.event_date || null : null,
      event_start_date: leadData.category === 'event' ? leadData.event_start_date || null : null,
      event_end_date: leadData.category === 'event' ? leadData.event_end_date || null : null,
      event_time: leadData.category === 'event' ? leadData.event_time || null : null,
      event_lead: leadData.category === 'event' ? leadData.event_lead || null : null,
      number_of_attendees: leadData.category === 'event' ? leadData.number_of_attendees || null : null,
      event_report: leadData.category === 'event' ? leadData.event_report || null : null,

      // SUPPLIER-SPECIFIC FIELDS
      supplier_name: leadData.category === 'supplier' ? leadData.supplier_name || null : null,
      supplier_location: leadData.category === 'supplier' ? leadData.supplier_location || null : null,
      supplier_product: leadData.category === 'supplier' ? leadData.supplier_product || null : null,
      price: leadData.category === 'supplier' ? leadData.price || null : null,
      unit_type: leadData.category === 'supplier' ? leadData.unit_type || null : null,

      // SHARED FIELDS
      contact_person: leadData.contact_person || null,
      mobile_number: leadData.mobile_number || null,
      email_address: leadData.email_address || null,
      product: leadData.product || null,
      status: leadData.status || 'not-started',
      remarks: leadData.remarks || null,
      disposition: leadData.disposition || null,
      assigned_to: leadData.assigned_to || employeeName,
      hot_category: leadData.hot_category || null,
      created_by: employeeName,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('hot_leads', lead as unknown as Record<string, unknown>);

    return lead;
  }

  async getLeadsByCategory(category: LeadCategory, hotCategory?: string): Promise<Lead[]> {
    let orderByField = 'created_at';
    if (category === 'lead') {
      orderByField = 'date_of_interaction';
    } else if (category === 'event') {
      orderByField = 'event_date';
    }

    const conditions: Record<string, unknown> = { category };
    if (hotCategory) {
      conditions.hot_category = hotCategory;
    }

    const leads = await this.db.all('hot_leads', conditions, orderByField);
    return (leads || []) as Lead[];
  }

  async getAllLeads(hotCategory?: string): Promise<Lead[]> {
    const conditions: Record<string, unknown> = {};
    if (hotCategory) {
      conditions.hot_category = hotCategory;
    }
    const leads = await this.db.all('hot_leads', conditions, 'created_at');
    return (leads || []) as Lead[];
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    const lead = await this.db.get('hot_leads', { id: leadId });
    return lead as Lead | null;
  }

  async updateLead(leadId: string, updates: Partial<LeadFormData>): Promise<void> {
    const updateData: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    // LEAD-SPECIFIC FIELDS
    if (updates.date_of_interaction !== undefined) updateData.date_of_interaction = updates.date_of_interaction || null;
    if (updates.lead_type !== undefined) updateData.lead_type = updates.lead_type || null;
    if (updates.company_name !== undefined) updateData.company_name = updates.company_name || null;
    if (updates.number_of_beneficiary !== undefined) updateData.number_of_beneficiary = updates.number_of_beneficiary || null;
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.lead_source !== undefined) updateData.lead_source = updates.lead_source || null;

    // EVENT-SPECIFIC FIELDS
    if (updates.event_name !== undefined) updateData.event_name = updates.event_name || null;
    if (updates.event_type !== undefined) updateData.event_type = updates.event_type || null;
    if (updates.venue !== undefined) updateData.venue = updates.venue || null;
    if (updates.event_date !== undefined) updateData.event_date = updates.event_date || null;
    if (updates.event_start_date !== undefined) updateData.event_start_date = updates.event_start_date || null;
    if (updates.event_end_date !== undefined) updateData.event_end_date = updates.event_end_date || null;
    if (updates.event_time !== undefined) updateData.event_time = updates.event_time || null;
    if (updates.event_lead !== undefined) updateData.event_lead = updates.event_lead || null;
    if (updates.number_of_attendees !== undefined) updateData.number_of_attendees = updates.number_of_attendees || null;
    if (updates.event_report !== undefined) updateData.event_report = updates.event_report || null;

    // SUPPLIER-SPECIFIC FIELDS
    if (updates.supplier_name !== undefined) updateData.supplier_name = updates.supplier_name || null;
    if (updates.supplier_location !== undefined) updateData.supplier_location = updates.supplier_location || null;
    if (updates.supplier_product !== undefined) updateData.supplier_product = updates.supplier_product || null;
    if (updates.price !== undefined) updateData.price = updates.price || null;
    if (updates.unit_type !== undefined) updateData.unit_type = updates.unit_type || null;

    // SHARED FIELDS
    if (updates.contact_person !== undefined) updateData.contact_person = updates.contact_person || null;
    if (updates.mobile_number !== undefined) updateData.mobile_number = updates.mobile_number || null;
    if (updates.email_address !== undefined) updateData.email_address = updates.email_address || null;
    if (updates.product !== undefined) updateData.product = updates.product || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.remarks !== undefined) updateData.remarks = updates.remarks || null;
    if (updates.disposition !== undefined) updateData.disposition = updates.disposition || null;
    if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to || null;
    if (updates.hot_category !== undefined) updateData.hot_category = updates.hot_category || null;

    await this.db.update('hot_leads', updateData, { id: leadId });
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.db.delete('hot_lead_activities', { lead_id: leadId });
    await this.db.delete('hot_leads', { id: leadId });
  }

  // ============ ACTIVITY LOGGING ============

  async logActivity(leadId: string, employeeName: string, activityData: ActivityFormData): Promise<LeadActivity> {
    const activity: LeadActivity = {
      id: randomUUID(),
      lead_id: leadId,
      employee_name: employeeName,
      activity_type: activityData.activity_type,
      activity_description: activityData.activity_description,
      start_date: activityData.start_date || null,
      end_date: activityData.end_date || null,
      status_update: activityData.status_update || null,
      created_at: new Date().toISOString(),
    };

    await this.db.insert('hot_lead_activities', activity as unknown as Record<string, unknown>);

    // Update lead's updated_at timestamp
    await this.db.update('hot_leads', { updated_at: new Date().toISOString() }, { id: leadId });

    // If status update is provided, update lead status
    if (activityData.status_update) {
      await this.db.update('hot_leads', { status: activityData.status_update }, { id: leadId });
    }

    return activity;
  }

  async getActivitiesForLead(leadId: string): Promise<LeadActivity[]> {
    const activities = await this.db.all('hot_lead_activities', { lead_id: leadId }, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async getAllActivities(): Promise<LeadActivity[]> {
    const activities = await this.db.all('hot_lead_activities', {}, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async deleteActivity(activityId: string): Promise<void> {
    await this.db.delete('hot_lead_activities', { id: activityId });
  }

  // ============ COMBINED QUERIES ============

  async getLeadsWithActivities(category?: LeadCategory, hotCategory?: string): Promise<LeadWithActivities[]> {
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`l.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (hotCategory) {
      conditions.push(`l.hot_category = $${paramIndex}`);
      params.push(hotCategory);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        l.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', la.id,
              'lead_id', la.lead_id,
              'employee_name', la.employee_name,
              'activity_type', la.activity_type,
              'activity_description', la.activity_description,
              'start_date', la.start_date,
              'end_date', la.end_date,
              'status_update', la.status_update,
              'created_at', la.created_at
            ) ORDER BY la.created_at DESC
          ) FILTER (WHERE la.id IS NOT NULL),
          '[]'::json
        ) as activities_json
      FROM hot_leads l
      LEFT JOIN hot_lead_activities la ON l.id = la.lead_id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;

    interface QueryResult extends Lead {
      activities_json: string;
    }

    try {
      const results = await this.db.executeRawSQL<QueryResult>(sql, params);

      return results.map((row) => {
        const activities: LeadActivity[] = JSON.parse(row.activities_json || '[]');
        return {
          ...row,
          activities,
          activity_count: activities.length,
          last_activity: activities[0] || undefined,
        };
      });
    } catch (error) {
      logger.error('Failed to fetch hot leads with activities using optimized query, falling back', error);
      const leads = category
        ? await this.getLeadsByCategory(category, hotCategory)
        : await this.getAllLeads(hotCategory);

      const leadsWithActivities: LeadWithActivities[] = await Promise.all(
        leads.map(async (lead) => {
          const activities = await this.getActivitiesForLead(lead.id);
          const sortedActivities = activities.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          return {
            ...lead,
            activities: sortedActivities,
            activity_count: activities.length,
            last_activity: sortedActivities[0] || undefined,
          };
        })
      );

      return leadsWithActivities;
    }
  }
}

export function getHotLeadService(): HotLeadService {
  return new HotLeadService();
}
