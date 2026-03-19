import { getDb } from './supabase';
import { Lead, LeadActivity, LeadFormData, ActivityFormData, LeadWithActivities, DashboardStats, LeadCategory } from '@/types/leads';
import { randomUUID } from 'crypto';
import { getWebhookService } from './webhooks';
import { logger } from './logger';

export class LeadService {
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
      event_date: leadData.category === 'event' ? leadData.event_date || null : null, // DEPRECATED
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
      cold_category: null,
      created_by: employeeName,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('leads', lead as unknown as Record<string, unknown>);

    // Fire webhook for lead created
    getWebhookService().fireEvent('lead.created', {
      leadId: lead.id,
      category: lead.category,
      name: lead.company_name || lead.event_name || lead.supplier_name,
      assignedTo: lead.assigned_to,
      createdBy: employeeName
    });

    return lead;
  }

  async getLeadsByCategory(category: LeadCategory): Promise<Lead[]> {
    // Sort by the appropriate date field for each category
    let orderByField = 'created_at';
    if (category === 'lead') {
      orderByField = 'date_of_interaction';
    } else if (category === 'event') {
      orderByField = 'event_date';
    }

    const leads = await this.db.all('leads', { category }, orderByField);
    return (leads || []) as Lead[];
  }

  async getAllLeads(): Promise<Lead[]> {
    const leads = await this.db.all('leads', {}, 'created_at');
    return (leads || []) as Lead[];
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    const lead = await this.db.get('leads', { id: leadId });
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

    await this.db.update('leads', updateData, { id: leadId });

    // Fire webhook: status_changed if status was updated, otherwise generic update
    if (updates.status !== undefined) {
      getWebhookService().fireEvent('lead.status_changed', {
        leadId,
        newStatus: updates.status,
        category: updates.category
      });
    } else {
      getWebhookService().fireEvent('lead.updated', {
        leadId,
        updatedFields: Object.keys(updates)
      });
    }
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.db.delete('leads', { id: leadId });
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

    await this.db.insert('lead_activities', activity as unknown as Record<string, unknown>);

    // Update lead's updated_at timestamp
    await this.db.update('leads', { updated_at: new Date().toISOString() }, { id: leadId });

    // If status update is provided, update lead status
    if (activityData.status_update) {
      await this.db.update('leads', { status: activityData.status_update }, { id: leadId });
    }

    // Fire webhook for activity logged
    getWebhookService().fireEvent('lead.activity_logged', {
      activityId: activity.id,
      leadId,
      employeeName,
      activityType: activityData.activity_type,
      description: activityData.activity_description,
      statusUpdate: activityData.status_update || null
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

  // ============ COMBINED QUERIES ============

  /**
   * Optimized version using SQL to avoid N+1 queries
   * Uses a single query with LEFT JOIN instead of N separate queries
   */
  async getLeadsWithActivities(category?: LeadCategory): Promise<LeadWithActivities[]> {
    // Build WHERE clause
    const whereClause = category ? `WHERE l.category = '${category}'` : '';

    // Single query with LEFT JOIN to get all leads with their activities
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

    interface QueryResult extends Lead {
      activities_json: string;
    }

    try {
      const results = await this.db.executeRawSQL<QueryResult>(sql);

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
      logger.error('Failed to fetch leads with activities using optimized query, falling back to old method', error);
      // Fallback to original implementation if SQL fails
      const leads = category
        ? await this.getLeadsByCategory(category)
        : await this.getAllLeads();

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

  // ============ ACTIVITY MONITOR ============

  async getEmployeeActivityBreakdown(startDate?: string, endDate?: string) {
    const leads = await this.getAllLeads();
    let activities = await this.getAllActivities();

    // Filter activities by date range if provided
    if (startDate || endDate) {
      activities = activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        if (startDate && activityDate < new Date(startDate)) return false;
        if (endDate && activityDate > new Date(endDate)) return false;
        return true;
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Build employee stats
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

    // Get all unique employees from leads (assigned_to) and activities
    const allEmployees = new Set<string>();
    leads.forEach(lead => {
      if (lead.assigned_to) allEmployees.add(lead.assigned_to);
    });
    activities.forEach(activity => {
      allEmployees.add(activity.employee_name);
    });

    // Initialize stats for all employees
    allEmployees.forEach(employeeName => {
      if (!employeeName) return;
      employeeStats[employeeName] = {
        employee_name: employeeName,
        total_activities: 0,
        activities_today: 0,
        activities_this_week: 0,
        activities_this_month: 0,
        calls: 0,
        emails: 0,
        meetings: 0,
        site_visits: 0,
        follow_ups: 0,
        other: 0,
        leads_assigned: leads.filter(l => l.assigned_to === employeeName).length,
        active_leads: leads.filter(l => l.assigned_to === employeeName && l.status !== 'closed-deal' && l.status !== 'rejected').length,
        closed_deals: leads.filter(l => l.assigned_to === employeeName && l.status === 'closed-deal').length,
      };
    });

    // Calculate activity stats
    for (const activity of activities) {
      if (!employeeStats[activity.employee_name]) continue;

      const stats = employeeStats[activity.employee_name];
      stats.total_activities += 1;

      // Time-based counts
      const activityDate = activity.created_at.split('T')[0];
      if (activityDate === today) stats.activities_today += 1;
      if (new Date(activity.created_at) >= weekAgo) stats.activities_this_week += 1;
      if (new Date(activity.created_at) >= monthAgo) stats.activities_this_month += 1;

      // Activity type counts
      if (activity.activity_type === 'call') stats.calls += 1;
      else if (activity.activity_type === 'email') stats.emails += 1;
      else if (activity.activity_type === 'meeting') stats.meetings += 1;
      else if (activity.activity_type === 'site-visit') stats.site_visits += 1;
      else if (activity.activity_type === 'follow-up') stats.follow_ups += 1;
      else stats.other += 1;
    }

    // Get last activity for each employee
    for (const employeeName of allEmployees) {
      const employeeActivities = activities
        .filter(a => a.employee_name === employeeName)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (employeeActivities.length > 0) {
        const lastActivity = employeeActivities[0];
        const lead = await this.getLeadById(lastActivity.lead_id);

        employeeStats[employeeName].last_activity_time = lastActivity.created_at;
        employeeStats[employeeName].last_activity_description = lastActivity.activity_description;
        employeeStats[employeeName].last_activity_lead = lead?.company_name || lead?.event_name || lead?.supplier_name || 'Unknown';
      }
    }

    return Object.values(employeeStats).sort((a, b) => b.total_activities - a.total_activities);
  }

  /**
   * Optimized version using SQL JOIN to avoid N+1 queries
   */
  async getRecentActivitiesForAllLeads(limit: number = 50) {
    const sql = `
      SELECT
        la.*,
        COALESCE(l.company_name, l.event_name, l.supplier_name, 'Unknown') as lead_name,
        COALESCE(l.category, 'lead') as lead_category,
        COALESCE(l.status, 'unknown') as lead_status
      FROM lead_activities la
      LEFT JOIN leads l ON la.lead_id = l.id
      ORDER BY la.created_at DESC
      LIMIT ${limit}
    `;

    try {
      const results = await this.db.executeRawSQL<LeadActivity & {
        lead_name: string;
        lead_category: LeadCategory;
        lead_status: string;
      }>(sql);

      return results;
    } catch (error) {
      logger.error('Failed to fetch recent activities using optimized query, falling back', error);
      // Fallback to original implementation
      const activities = await this.getAllActivities();

      const sortedActivities = activities.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const activitiesWithLeads = await Promise.all(
        sortedActivities.slice(0, limit).map(async (activity) => {
          const lead = await this.getLeadById(activity.lead_id);
          return {
            ...activity,
            lead_name: lead?.company_name || lead?.event_name || lead?.supplier_name || 'Unknown',
            lead_category: lead?.category || 'lead',
            lead_status: lead?.status || 'unknown',
          };
        })
      );

      return activitiesWithLeads;
    }
  }

  async getStaleLeads(daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const leadsWithActivities = await this.getLeadsWithActivities();

    const staleLeads = leadsWithActivities.filter(lead => {
      // Don't include closed or rejected leads
      if (lead.status === 'closed-deal' || lead.status === 'rejected') return false;

      // Leads with no activities are stale
      if (lead.activity_count === 0) return true;

      // Leads with last activity before threshold are stale
      if (!lead.last_activity) return true;
      const lastActivityDate = new Date(lead.last_activity.created_at);
      return lastActivityDate < thresholdDate;
    });

    // Group by assigned employee
    const staleByEmployee: Record<string, typeof leadsWithActivities> = {};
    staleLeads.forEach(lead => {
      const assignedTo = lead.assigned_to || 'Unassigned';
      if (!staleByEmployee[assignedTo]) {
        staleByEmployee[assignedTo] = [];
      }
      staleByEmployee[assignedTo].push(lead);
    });

    return {
      total_stale: staleLeads.length,
      stale_leads: staleLeads,
      by_employee: Object.entries(staleByEmployee).map(([employee, leads]) => ({
        employee_name: employee,
        stale_count: leads.length,
        leads,
      })).sort((a, b) => b.stale_count - a.stale_count),
    };
  }

  async getLeadAssignmentOverview() {
    const leads = await this.getAllLeads();

    // Group leads by assigned employee
    const assignmentStats: Record<string, {
      employee_name: string;
      total_assigned: number;
      by_category: Record<string, number>;
      by_status: Record<string, number>;
      active_count: number;
      closed_count: number;
      rejected_count: number;
    }> = {};

    leads.forEach(lead => {
      const assignedTo = lead.assigned_to || 'Unassigned';

      if (!assignmentStats[assignedTo]) {
        assignmentStats[assignedTo] = {
          employee_name: assignedTo,
          total_assigned: 0,
          by_category: {},
          by_status: {},
          active_count: 0,
          closed_count: 0,
          rejected_count: 0,
        };
      }

      const stats = assignmentStats[assignedTo];
      stats.total_assigned += 1;

      // Category breakdown
      stats.by_category[lead.category] = (stats.by_category[lead.category] || 0) + 1;

      // Status breakdown
      stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;

      // Count by key status
      if (lead.status === 'closed-deal') stats.closed_count += 1;
      else if (lead.status === 'rejected') stats.rejected_count += 1;
      else stats.active_count += 1;
    });

    return Object.values(assignmentStats).sort((a, b) => b.total_assigned - a.total_assigned);
  }

  // ============ DASHBOARD STATS ============

  async getDashboardStats(): Promise<DashboardStats> {
    const leads = await this.getAllLeads();
    const activities = await this.getAllActivities();

    // Total and active leads
    const total_leads = leads.length;
    const active_leads = leads.filter(l => l.status !== 'closed-deal').length;
    const closed_deals = leads.filter(l => l.status === 'closed-deal').length;

    // Activity stats
    const total_activities = activities.length;
    const today = new Date().toISOString().split('T')[0];
    const activities_today = activities.filter(a =>
      a.created_at.split('T')[0] === today
    ).length;

    // Leads by category
    const categoryCounts: Record<LeadCategory, number> = {
      lead: 0,
      event: 0,
      supplier: 0,
    };

    leads.forEach(lead => {
      categoryCounts[lead.category] = (categoryCounts[lead.category] || 0) + 1;
    });

    const by_category = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category as LeadCategory,
      count,
      percentage: total_leads > 0 ? Math.round((count / total_leads) * 100) : 0,
    })).filter(c => c.count > 0);

    // Leads by status
    const statusCounts: Record<string, number> = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    const by_status = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Employee activity stats
    const employeeStats: Record<string, {
      total_activities: number;
      calls: number;
      emails: number;
      meetings: number;
      site_visits: number;
      leads_assigned: number;
    }> = {};

    activities.forEach(activity => {
      if (!employeeStats[activity.employee_name]) {
        employeeStats[activity.employee_name] = {
          total_activities: 0,
          calls: 0,
          emails: 0,
          meetings: 0,
          site_visits: 0,
          leads_assigned: leads.filter(l => l.assigned_to === activity.employee_name).length,
        };
      }

      const stats = employeeStats[activity.employee_name];
      stats.total_activities += 1;

      if (activity.activity_type === 'call') stats.calls += 1;
      else if (activity.activity_type === 'email') stats.emails += 1;
      else if (activity.activity_type === 'meeting') stats.meetings += 1;
      else if (activity.activity_type === 'site-visit') stats.site_visits += 1;
    });

    const employee_activities = Object.entries(employeeStats)
      .map(([employee_name, stats]) => ({
        employee_name,
        ...stats,
      }))
      .sort((a, b) => b.total_activities - a.total_activities);

    // Recent activities with lead info (optimized - reuse getRecentActivitiesForAllLeads)
    const recentActivitiesData = await this.getRecentActivitiesForAllLeads(20);
    const recent_activities = recentActivitiesData.map(activity => ({
      ...activity,
      company_name: activity.lead_name,
      category: activity.lead_category,
    }));

    // Stale leads (no activity in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsWithActivities = await this.getLeadsWithActivities();
    const stale_leads = leadsWithActivities.filter(lead => {
      if (lead.status === 'closed-deal') return false;
      if (lead.activity_count === 0) return true;
      if (!lead.last_activity) return true;

      const lastActivityDate = new Date(lead.last_activity.created_at);
      return lastActivityDate < thirtyDaysAgo;
    });

    return {
      total_leads,
      active_leads,
      total_activities,
      activities_today,
      closed_deals,
      by_category,
      by_status,
      employee_activities,
      recent_activities,
      stale_leads,
    };
  }
}

export function getLeadService(): LeadService {
  return new LeadService();
}
