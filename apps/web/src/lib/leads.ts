import { getDb } from './supabase';
import { Lead, LeadActivity, LeadFormData, ActivityFormData, LeadWithActivities, DashboardStats, LeadType, Pipeline, Industry } from '@/types/leads';
import { randomUUID } from 'crypto';
import { getWebhookService } from './webhooks';
import { logger } from './logger';

export interface LeadFilter {
  type?: LeadType;
  pipeline?: Pipeline;
  industry?: Industry;
}

export class LeadService {
  private db = getDb();

  async createLead(employeeName: string, leadData: LeadFormData): Promise<Lead> {
    const now = new Date().toISOString();
    const type = leadData.type;
    const pipeline: Pipeline = leadData.pipeline || 'warm';
    const industry: Industry | null = leadData.industry || null;

    const lead: Lead = {
      id: randomUUID(),
      type,
      pipeline,
      industry,

      lead_type: type === 'lead' ? leadData.lead_type || null : null,
      company_name: type === 'lead' ? leadData.company_name || null : null,
      number_of_beneficiary: type === 'lead' ? leadData.number_of_beneficiary || null : null,
      location: type === 'lead' ? leadData.location || null : null,
      lead_source: type === 'lead' ? leadData.lead_source || null : null,

      event_name: type === 'event' ? leadData.event_name || null : null,
      event_type: type === 'event' ? leadData.event_type || null : null,
      venue: type === 'event' ? leadData.venue || null : null,
      event_start_date: type === 'event' ? leadData.event_start_date || null : null,
      event_end_date: type === 'event' ? leadData.event_end_date || null : null,
      event_time: type === 'event' ? leadData.event_time || null : null,
      event_lead: type === 'event' ? leadData.event_lead || null : null,
      number_of_attendees: type === 'event' ? leadData.number_of_attendees || null : null,
      event_report: type === 'event' ? leadData.event_report || null : null,

      participation: type === 'event' ? leadData.participation || null : null,

      supplier_name: type === 'supplier' ? leadData.supplier_name || null : null,
      supplier_location: type === 'supplier' ? leadData.supplier_location || null : null,
      supplier_product: type === 'supplier' ? leadData.supplier_product || null : null,
      price: type === 'supplier' ? leadData.price || null : null,
      unit_type: type === 'supplier' ? leadData.unit_type || null : null,

      contact_person: leadData.contact_person || null,
      mobile_number: leadData.mobile_number || null,
      email_address: leadData.email_address || null,
      product: leadData.product || null,
      status: leadData.status || 'not-started',
      remarks: leadData.remarks || null,
      disposition: leadData.disposition || null,
      assigned_to: leadData.assigned_to || employeeName,
      created_by: employeeName,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('leads', lead as unknown as Record<string, unknown>);

    getWebhookService().fireEvent('lead.created', {
      leadId: lead.id,
      type: lead.type,
      pipeline: lead.pipeline,
      industry: lead.industry,
      name: lead.company_name || lead.event_name || lead.supplier_name,
      assignedTo: lead.assigned_to,
      createdBy: employeeName,
    });

    return lead;
  }

  async getLeads(filter: LeadFilter = {}): Promise<Lead[]> {
    const conditions: Record<string, unknown> = {};
    if (filter.type) conditions.type = filter.type;
    if (filter.pipeline) conditions.pipeline = filter.pipeline;
    if (filter.industry) conditions.industry = filter.industry;

    let orderByField = 'created_at';
    if (filter.type === 'event') orderByField = 'event_start_date';

    const leads = await this.db.all('leads', conditions, orderByField);
    return (leads || []) as Lead[];
  }

  async getAllLeads(): Promise<Lead[]> {
    return this.getLeads();
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    const lead = await this.db.get('leads', { id: leadId });
    return lead as Lead | null;
  }

  async updateLead(leadId: string, updates: Partial<LeadFormData>): Promise<void> {
    const updateData: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.pipeline !== undefined) updateData.pipeline = updates.pipeline;
    if (updates.industry !== undefined) updateData.industry = updates.industry || null;

    if (updates.lead_type !== undefined) updateData.lead_type = updates.lead_type || null;
    if (updates.company_name !== undefined) updateData.company_name = updates.company_name || null;
    if (updates.number_of_beneficiary !== undefined) updateData.number_of_beneficiary = updates.number_of_beneficiary || null;
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.lead_source !== undefined) updateData.lead_source = updates.lead_source || null;

    if (updates.event_name !== undefined) updateData.event_name = updates.event_name || null;
    if (updates.event_type !== undefined) updateData.event_type = updates.event_type || null;
    if (updates.venue !== undefined) updateData.venue = updates.venue || null;
    if (updates.event_start_date !== undefined) updateData.event_start_date = updates.event_start_date || null;
    if (updates.event_end_date !== undefined) updateData.event_end_date = updates.event_end_date || null;
    if (updates.event_time !== undefined) updateData.event_time = updates.event_time || null;
    if (updates.event_lead !== undefined) updateData.event_lead = updates.event_lead || null;
    if (updates.number_of_attendees !== undefined) updateData.number_of_attendees = updates.number_of_attendees || null;
    if (updates.event_report !== undefined) updateData.event_report = updates.event_report || null;
    if (updates.participation !== undefined) updateData.participation = updates.participation || null;

    if (updates.supplier_name !== undefined) updateData.supplier_name = updates.supplier_name || null;
    if (updates.supplier_location !== undefined) updateData.supplier_location = updates.supplier_location || null;
    if (updates.supplier_product !== undefined) updateData.supplier_product = updates.supplier_product || null;
    if (updates.price !== undefined) updateData.price = updates.price || null;
    if (updates.unit_type !== undefined) updateData.unit_type = updates.unit_type || null;

    if (updates.contact_person !== undefined) updateData.contact_person = updates.contact_person || null;
    if (updates.mobile_number !== undefined) updateData.mobile_number = updates.mobile_number || null;
    if (updates.email_address !== undefined) updateData.email_address = updates.email_address || null;
    if (updates.product !== undefined) updateData.product = updates.product || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.remarks !== undefined) updateData.remarks = updates.remarks || null;
    if (updates.disposition !== undefined) updateData.disposition = updates.disposition || null;
    if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to || null;

    await this.db.update('leads', updateData, { id: leadId });

    if (updates.status !== undefined) {
      getWebhookService().fireEvent('lead.status_changed', {
        leadId,
        newStatus: updates.status,
        type: updates.type,
      });
    } else {
      getWebhookService().fireEvent('lead.updated', {
        leadId,
        updatedFields: Object.keys(updates),
      });
    }
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.db.delete('leads', { id: leadId });
  }

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

    await this.db.insert('lead_activities', activity as unknown as Record<string, unknown>);
    await this.db.update('leads', { updated_at: new Date().toISOString() }, { id: leadId });

    if (activityData.status_update) {
      await this.db.update('leads', { status: activityData.status_update }, { id: leadId });
    }

    getWebhookService().fireEvent('lead.activity_logged', {
      activityId: activity.id,
      leadId,
      employeeName,
      activityType: activityData.activity_type,
      description: activityData.activity_description,
      statusUpdate: activityData.status_update || null,
    });

    return activity;
  }

  async getActivitiesForLead(leadId: string): Promise<LeadActivity[]> {
    const activities = await this.db.all('lead_activities', { lead_id: leadId }, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async getAllActivities(): Promise<LeadActivity[]> {
    const activities = await this.db.all('lead_activities', {}, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async deleteActivity(activityId: string): Promise<void> {
    await this.db.delete('lead_activities', { id: activityId });
  }

  async getLeadsWithActivities(filter: LeadFilter = {}): Promise<LeadWithActivities[]> {
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (filter.type) { conditions.push(`l.type = $${paramIndex++}`); params.push(filter.type); }
    if (filter.pipeline) { conditions.push(`l.pipeline = $${paramIndex++}`); params.push(filter.pipeline); }
    if (filter.industry) { conditions.push(`l.industry = $${paramIndex++}`); params.push(filter.industry); }

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
      FROM leads l
      LEFT JOIN lead_activities la ON l.id = la.lead_id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;

    interface QueryResult extends Lead { activities_json: string; }

    try {
      const results = await this.db.executeRawSQL<QueryResult>(sql, params);
      return results.map((row) => {
        const activities: LeadActivity[] = JSON.parse(row.activities_json || '[]');
        return { ...row, activities, activity_count: activities.length, last_activity: activities[0] || undefined };
      });
    } catch (error) {
      logger.error('Failed to fetch leads with activities, falling back', error);
      const leads = await this.getLeads(filter);
      return Promise.all(
        leads.map(async (lead) => {
          const activities = await this.getActivitiesForLead(lead.id);
          const sorted = activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return { ...lead, activities: sorted, activity_count: activities.length, last_activity: sorted[0] || undefined };
        })
      );
    }
  }

  async getEmployeeActivityBreakdown(startDate?: string, endDate?: string) {
    const leads = await this.getAllLeads();
    let activities = await this.getAllActivities();

    if (startDate || endDate) {
      activities = activities.filter(a => {
        const d = new Date(a.created_at);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

    const employeeStats: Record<string, {
      employee_name: string;
      total_activities: number;
      activities_today: number;
      activities_this_week: number;
      activities_this_month: number;
      calls: number;
      emails: number;
      meetings: number;
      site_visits: number;
      follow_ups: number;
      other: number;
      leads_assigned: number;
      active_leads: number;
      closed_deals: number;
      last_activity_time?: string;
      last_activity_description?: string;
      last_activity_lead?: string;
    }> = {};

    const allEmployees = new Set<string>();
    leads.forEach(l => { if (l.assigned_to) allEmployees.add(l.assigned_to); });
    activities.forEach(a => allEmployees.add(a.employee_name));

    allEmployees.forEach(name => {
      if (!name) return;
      employeeStats[name] = {
        employee_name: name,
        total_activities: 0, activities_today: 0, activities_this_week: 0, activities_this_month: 0,
        calls: 0, emails: 0, meetings: 0, site_visits: 0, follow_ups: 0, other: 0,
        leads_assigned: leads.filter(l => l.assigned_to === name).length,
        active_leads: leads.filter(l => l.assigned_to === name && l.status !== 'closed-deal' && l.status !== 'rejected').length,
        closed_deals: leads.filter(l => l.assigned_to === name && l.status === 'closed-deal').length,
      };
    });

    for (const a of activities) {
      const stats = employeeStats[a.employee_name];
      if (!stats) continue;
      stats.total_activities += 1;
      const aDate = a.created_at.split('T')[0];
      if (aDate === today) stats.activities_today += 1;
      if (new Date(a.created_at) >= weekAgo) stats.activities_this_week += 1;
      if (new Date(a.created_at) >= monthAgo) stats.activities_this_month += 1;
      if (a.activity_type === 'call') stats.calls += 1;
      else if (a.activity_type === 'email') stats.emails += 1;
      else if (a.activity_type === 'meeting') stats.meetings += 1;
      else if (a.activity_type === 'site-visit') stats.site_visits += 1;
      else if (a.activity_type === 'follow-up') stats.follow_ups += 1;
      else stats.other += 1;
    }

    for (const name of allEmployees) {
      const sorted = activities.filter(a => a.employee_name === name).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (sorted.length > 0) {
        const last = sorted[0];
        const lead = await this.getLeadById(last.lead_id);
        employeeStats[name].last_activity_time = last.created_at;
        employeeStats[name].last_activity_description = last.activity_description;
        employeeStats[name].last_activity_lead = lead?.company_name || lead?.event_name || lead?.supplier_name || 'Unknown';
      }
    }

    return Object.values(employeeStats).sort((a, b) => b.total_activities - a.total_activities);
  }

  async getRecentActivitiesForAllLeads(limit: number = 50) {
    const sql = `
      SELECT
        la.*,
        COALESCE(l.company_name, l.event_name, l.supplier_name, 'Unknown') as lead_name,
        COALESCE(l.type, 'lead') as lead_type,
        COALESCE(l.status, 'unknown') as lead_status
      FROM lead_activities la
      LEFT JOIN leads l ON la.lead_id = l.id
      ORDER BY la.created_at DESC
      LIMIT $1
    `;

    try {
      const results = await this.db.executeRawSQL<LeadActivity & {
        lead_name: string;
        lead_type: LeadType;
        lead_status: string;
      }>(sql, [String(limit)]);
      return results;
    } catch (error) {
      logger.error('Failed to fetch recent activities, falling back', error);
      const activities = (await this.getAllActivities())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
      return Promise.all(activities.map(async (a) => {
        const lead = await this.getLeadById(a.lead_id);
        return {
          ...a,
          lead_name: lead?.company_name || lead?.event_name || lead?.supplier_name || 'Unknown',
          lead_type: (lead?.type || 'lead') as LeadType,
          lead_status: lead?.status || 'unknown',
        };
      }));
    }
  }

  async getStaleLeads(daysThreshold: number = 30) {
    const threshold = new Date(); threshold.setDate(threshold.getDate() - daysThreshold);
    const leads = await this.getLeadsWithActivities();

    const stale = leads.filter(l => {
      if (l.status === 'closed-deal' || l.status === 'rejected') return false;
      if (l.activity_count === 0) return true;
      if (!l.last_activity) return true;
      return new Date(l.last_activity.created_at) < threshold;
    });

    const byEmployee: Record<string, typeof leads> = {};
    stale.forEach(l => {
      const key = l.assigned_to || 'Unassigned';
      if (!byEmployee[key]) byEmployee[key] = [];
      byEmployee[key].push(l);
    });

    return {
      total_stale: stale.length,
      stale_leads: stale,
      by_employee: Object.entries(byEmployee).map(([employee_name, leads]) => ({
        employee_name, stale_count: leads.length, leads,
      })).sort((a, b) => b.stale_count - a.stale_count),
    };
  }

  async getLeadAssignmentOverview() {
    const leads = await this.getAllLeads();
    const stats: Record<string, {
      employee_name: string;
      total_assigned: number;
      by_type: Record<string, number>;
      by_status: Record<string, number>;
      active_count: number;
      closed_count: number;
      rejected_count: number;
    }> = {};

    leads.forEach(lead => {
      const key = lead.assigned_to || 'Unassigned';
      if (!stats[key]) {
        stats[key] = { employee_name: key, total_assigned: 0, by_type: {}, by_status: {}, active_count: 0, closed_count: 0, rejected_count: 0 };
      }
      const s = stats[key];
      s.total_assigned += 1;
      s.by_type[lead.type] = (s.by_type[lead.type] || 0) + 1;
      s.by_status[lead.status] = (s.by_status[lead.status] || 0) + 1;
      if (lead.status === 'closed-deal') s.closed_count += 1;
      else if (lead.status === 'rejected') s.rejected_count += 1;
      else s.active_count += 1;
    });

    return Object.values(stats).sort((a, b) => b.total_assigned - a.total_assigned);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const leads = await this.getAllLeads();
    const activities = await this.getAllActivities();

    const total_leads = leads.length;
    const active_leads = leads.filter(l => l.status !== 'closed-deal').length;
    const closed_deals = leads.filter(l => l.status === 'closed-deal').length;

    const total_activities = activities.length;
    const today = new Date().toISOString().split('T')[0];
    const activities_today = activities.filter(a => a.created_at.split('T')[0] === today).length;

    const typeCounts: Record<LeadType, number> = { lead: 0, event: 0, supplier: 0 };
    leads.forEach(l => { typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });

    const by_category = Object.entries(typeCounts).map(([type, count]) => ({
      category: type as LeadType,
      count,
      percentage: total_leads > 0 ? Math.round((count / total_leads) * 100) : 0,
    })).filter(c => c.count > 0);

    const statusCounts: Record<string, number> = {};
    leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
    const by_status = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const empStats: Record<string, { total_activities: number; calls: number; emails: number; meetings: number; site_visits: number; leads_assigned: number }> = {};
    activities.forEach(a => {
      if (!empStats[a.employee_name]) {
        empStats[a.employee_name] = {
          total_activities: 0, calls: 0, emails: 0, meetings: 0, site_visits: 0,
          leads_assigned: leads.filter(l => l.assigned_to === a.employee_name).length,
        };
      }
      const s = empStats[a.employee_name];
      s.total_activities += 1;
      if (a.activity_type === 'call') s.calls += 1;
      else if (a.activity_type === 'email') s.emails += 1;
      else if (a.activity_type === 'meeting') s.meetings += 1;
      else if (a.activity_type === 'site-visit') s.site_visits += 1;
    });

    const employee_activities = Object.entries(empStats)
      .map(([employee_name, stats]) => ({ employee_name, ...stats }))
      .sort((a, b) => b.total_activities - a.total_activities);

    const recentData = await this.getRecentActivitiesForAllLeads(20);
    const recent_activities = recentData.map(a => ({ ...a, company_name: a.lead_name, category: a.lead_type }));

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const leadsWithActs = await this.getLeadsWithActivities();
    const stale_leads = leadsWithActs.filter(l => {
      if (l.status === 'closed-deal') return false;
      if (l.activity_count === 0) return true;
      if (!l.last_activity) return true;
      return new Date(l.last_activity.created_at) < thirtyDaysAgo;
    });

    return { total_leads, active_leads, total_activities, activities_today, closed_deals, by_category, by_status, employee_activities, recent_activities, stale_leads };
  }
}

export function getLeadService(): LeadService {
  return new LeadService();
}
