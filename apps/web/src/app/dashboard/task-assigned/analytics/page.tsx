'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { DashboardStats, LeadCategory } from '@/types/leads';
import { logger } from '@/lib/logger';
import { BarChart3, Target, CheckCircle, FileText, Zap, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';

const CATEGORY_COLORS: Record<LeadCategory, string> = {
  lead: '#0078D4',
  event: '#D13438',
  supplier: '#107C10',
};

export default function LeadAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has permission to view analytics
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      router.push('/dashboard');
      return;
    }

    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads/dashboard');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      } else {
        logger.error('Failed to fetch dashboard stats', data.error);
      }
    } catch (error) {
      logger.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2F1] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-12 w-12 text-[#0078D4]" />
          <p className="mt-4 text-[#605E5C] text-base">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F3F2F1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#605E5C] text-base">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F1] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-[#323130] mb-1">Activity Dashboard</h1>
          <p className="text-[#605E5C] text-sm">Track team performance and lead activity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-5">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-5 h-5 text-[#0078D4]" />
            </div>
            <div className="text-2xl font-semibold text-[#323130]">{stats.total_leads}</div>
            <div className="text-xs text-[#605E5C] mt-1">Total Leads</div>
          </div>
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-5">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 text-[#0078D4]" />
            </div>
            <div className="text-2xl font-semibold text-[#0078D4]">{stats.active_leads}</div>
            <div className="text-xs text-[#605E5C] mt-1">Active Leads</div>
          </div>
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-5">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-5 h-5 text-[#107C10]" />
            </div>
            <div className="text-2xl font-semibold text-[#107C10]">{stats.closed_deals}</div>
            <div className="text-xs text-[#605E5C] mt-1">Closed Deals</div>
          </div>
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-5">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-5 h-5 text-[#8764B8]" />
            </div>
            <div className="text-2xl font-semibold text-[#8764B8]">{stats.total_activities}</div>
            <div className="text-xs text-[#605E5C] mt-1">Total Activities</div>
          </div>
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-5">
            <div className="flex items-center justify-between mb-3">
              <Zap className="w-5 h-5 text-[#F59B00]" />
            </div>
            <div className="text-2xl font-semibold text-[#F59B00]">{stats.activities_today}</div>
            <div className="text-xs text-[#605E5C] mt-1">Today&apos;s Activities</div>
          </div>
        </div>

        {/* Employee Activity Leaderboard */}
        <div className="bg-white rounded-lg border border-[#E1DFDD] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#323130] mb-4">Employee Activity Leaderboard</h2>
          <div className="space-y-3">
            {stats.employee_activities.length === 0 ? (
              <p className="text-[#605E5C] text-center py-8 text-sm">No employee activities yet</p>
            ) : (
              stats.employee_activities.map((employee, index) => (
                <div key={employee.employee_name} className="border border-[#E1DFDD] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded bg-[#0078D4] flex items-center justify-center text-white font-semibold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#323130]">{employee.employee_name}</h3>
                        <p className="text-xs text-[#605E5C]">{employee.leads_assigned} leads assigned</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-[#323130]">{employee.total_activities}</div>
                      <div className="text-xs text-[#605E5C]">Total Activities</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-[#E6F3FF] rounded">
                      <div className="text-lg font-semibold text-[#0078D4]">{employee.calls}</div>
                      <div className="text-xs text-[#605E5C]">Calls</div>
                    </div>
                    <div className="text-center p-2 bg-[#F0E6FF] rounded">
                      <div className="text-lg font-semibold text-[#8764B8]">{employee.emails}</div>
                      <div className="text-xs text-[#605E5C]">Emails</div>
                    </div>
                    <div className="text-center p-2 bg-[#E6F4EA] rounded">
                      <div className="text-lg font-semibold text-[#107C10]">{employee.meetings}</div>
                      <div className="text-xs text-[#605E5C]">Meetings</div>
                    </div>
                    <div className="text-center p-2 bg-[#FFF4E5] rounded">
                      <div className="text-lg font-semibold text-[#F59B00]">{employee.site_visits}</div>
                      <div className="text-xs text-[#605E5C]">Visits</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Leads by Category */}
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-6">
            <h2 className="text-xl font-semibold text-[#323130] mb-4">Leads by Category</h2>
            <div className="space-y-4">
              {stats.by_category.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#323130] font-medium capitalize">{category.category}</span>
                    <span className="text-sm text-[#605E5C] font-semibold">{category.count} ({category.percentage}%)</span>
                  </div>
                  <div className="w-full bg-[#F3F2F1] rounded h-2 overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[category.category],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leads by Status */}
          <div className="bg-white rounded-lg border border-[#E1DFDD] p-6">
            <h2 className="text-xl font-semibold text-[#323130] mb-4">Leads by Status</h2>
            <div className="space-y-2">
              {stats.by_status.map((status) => (
                <div key={status.status} className="flex items-center justify-between p-3 bg-[#F3F2F1] rounded">
                  <span className="text-sm text-[#323130] font-medium capitalize">{status.status.replace('-', ' ')}</span>
                  <span className="text-lg font-semibold text-[#323130]">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stale Leads Alert */}
        {stats.stale_leads.length > 0 && (
          <div className="bg-[#FDE7E9] border border-[#D13438] rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-[#D13438] flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#A4262C] mb-1">Stale Leads Alert</h2>
                <p className="text-sm text-[#A4262C] mb-3">
                  {stats.stale_leads.length} lead(s) have no activity in the last 30 days
                </p>
                <div className="space-y-2">
                  {stats.stale_leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="bg-white rounded p-3 border border-[#D13438]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-[#323130]">{lead.company_name}</div>
                          <div className="text-xs text-[#605E5C]">
                            Assigned to: {lead.assigned_to || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-xs text-[#A4262C] font-medium">
                          {lead.activity_count} activities
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.stale_leads.length > 5 && (
                    <p className="text-xs text-[#A4262C] text-center pt-2">
                      +{stats.stale_leads.length - 5} more stale leads
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activities Feed */}
        <div className="bg-white rounded-lg border border-[#E1DFDD] p-6">
          <h2 className="text-xl font-semibold text-[#323130] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Activity Feed
          </h2>
          <div className="space-y-3">
            {stats.recent_activities.length === 0 ? (
              <p className="text-[#605E5C] text-center py-8 text-sm">No activities yet</p>
            ) : (
              stats.recent_activities.map((activity) => (
                <div key={activity.id} className="border-l-4 border-[#0078D4] bg-[#F3F2F1] rounded-r p-3 hover:bg-[#E6F3FF] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-sm text-[#323130]">{activity.employee_name}</span>
                        <span className="text-[#8A8886]">•</span>
                        <span className="text-xs text-[#605E5C]">{activity.company_name}</span>
                        <span className="px-2 py-0.5 bg-[#E6F3FF] text-[#0078D4] text-xs font-medium rounded border border-[#0078D4]">
                          {activity.category}
                        </span>
                      </div>
                      <p className="text-sm text-[#323130] mb-2">{activity.activity_description}</p>
                      <div className="flex items-center space-x-3 text-xs text-[#605E5C]">
                        <span className="capitalize">{activity.activity_type.replace('-', ' ')}</span>
                        <span>{formatDate(activity.created_at)}</span>
                        {activity.status_update && (
                          <span className="text-[#107C10] font-medium">
                            Status: {activity.status_update.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
