'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Activity, TrendingUp, AlertCircle, Users, RefreshCw } from 'lucide-react';
import ActivityFeedCard from '@/components/leads/ActivityFeedCard';
import EmployeePerformanceCard from '@/components/leads/EmployeePerformanceCard';
import StaleLeadsAlert from '@/components/leads/StaleLeadsAlert';

interface EmployeeBreakdown {
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
}

interface RecentActivity {
  id: string;
  employee_name: string;
  activity_type: string;
  activity_description: string;
  lead_name: string;
  lead_type: string;
  lead_status: string;
  created_at: string;
}

interface StaleLead {
  id: string;
  company_name: string | null;
  event_name: string | null;
  supplier_name: string | null;
  type: string;
  status: string;
  assigned_to: string | null;
  activity_count: number;
  created_at: string;
  last_activity?: {
    created_at: string;
    activity_description: string;
  };
}

interface StaleLeadsData {
  total_stale: number;
  stale_leads: StaleLead[];
  by_employee: Array<{
    employee_name: string;
    stale_count: number;
    leads: StaleLead[];
  }>;
}

interface ActivityMonitorData {
  summary: {
    total_activities: number;
    activities_today: number;
    active_employees: number;
    total_employees: number;
    stale_leads_count: number;
  };
  employee_breakdown: EmployeeBreakdown[];
  recent_activities: RecentActivity[];
  stale_leads: StaleLeadsData;
  assignment_overview: unknown[];
}

export default function ActivityMonitorPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<ActivityMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch activity monitor data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/leads/activity-monitor');

      if (response.status === 403) {
        setError('You do not have permission to access this page.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch activity monitor data');
      }

      const result = await response.json();
      setData(result.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching activity monitor data:', err);
      setError('Failed to load activity monitor data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user has access (admin and manager)
      if (user.role !== 'admin' && user.role !== 'manager') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF9F8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0078D4] mx-auto mb-4"></div>
          <p className="text-[#605E5C] text-lg">Loading activity monitor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF9F8]">
        <div className="bg-white p-8 rounded-lg border-2 border-[#D13438] max-w-md">
          <AlertCircle className="text-[#D13438] mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-[#323130] text-center mb-2">Access Denied</h2>
          <p className="text-[#605E5C] text-center">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 w-full bg-[#0078D4] text-white py-2 px-4 rounded hover:bg-[#106EBE] transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0078D4] to-[#5A9FD4] rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#323130]">Activity Monitor</h1>
                <p className="text-[#605E5C]">Real-time team performance and lead activity tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-[#8A8886]">Last updated</div>
                <div className="text-sm font-medium text-[#323130]">
                  {lastRefresh.toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white border border-[#E1DFDD] text-[#323130] py-2 px-4 rounded-lg hover:bg-[#F3F2F1] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#0078D4] rounded focus:ring-2 focus:ring-[#0078D4]"
                />
                <span className="text-sm text-[#605E5C]">Auto-refresh</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E1DFDD] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#8A8886] text-sm font-medium">Total Activities</div>
              <Activity className="text-[#0078D4]" size={20} />
            </div>
            <div className="text-3xl font-bold text-[#323130]">{data.summary.total_activities}</div>
            <div className="text-xs text-[#8A8886] mt-1">All time</div>
          </div>

          <div className="bg-gradient-to-br from-[#0078D4] to-[#5A9FD4] rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/90 text-sm font-medium">Today&apos;s Activities</div>
              <TrendingUp size={20} />
            </div>
            <div className="text-3xl font-bold">{data.summary.activities_today}</div>
            <div className="text-xs text-white/80 mt-1">Last 24 hours</div>
          </div>

          <div className="bg-white border border-[#E1DFDD] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#8A8886] text-sm font-medium">Active Employees</div>
              <Users className="text-[#107C10]" size={20} />
            </div>
            <div className="text-3xl font-bold text-[#323130]">
              {data.summary.active_employees}/{data.summary.total_employees}
            </div>
            <div className="text-xs text-[#8A8886] mt-1">
              {Math.round((data.summary.active_employees / data.summary.total_employees) * 100)}% engagement
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            data.summary.stale_leads_count > 0
              ? 'bg-gradient-to-br from-[#F59B00] to-[#F5B000] text-white'
              : 'bg-gradient-to-br from-[#107C10] to-[#0B5A0B] text-white'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/90 text-sm font-medium">Stale Leads</div>
              <AlertCircle size={20} />
            </div>
            <div className="text-3xl font-bold">{data.summary.stale_leads_count}</div>
            <div className="text-xs text-white/80 mt-1">
              {data.summary.stale_leads_count === 0 ? 'All leads active!' : 'Needs attention'}
            </div>
          </div>
        </div>

        {/* Stale Leads Alert */}
        <div className="mb-6">
          <StaleLeadsAlert staleData={data.stale_leads} daysThreshold={30} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Employee Performance (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#323130] flex items-center gap-2">
                <TrendingUp size={24} className="text-[#0078D4]" />
                Employee Performance
              </h2>
              <span className="text-sm text-[#8A8886]">
                {data.employee_breakdown.length} team member{data.employee_breakdown.length !== 1 ? 's' : ''}
              </span>
            </div>

            {data.employee_breakdown.length === 0 ? (
              <div className="bg-white border border-[#E1DFDD] rounded-lg p-8 text-center">
                <Users size={48} className="text-[#C8C6C4] mx-auto mb-3" />
                <p className="text-[#605E5C]">No employee activity data available</p>
              </div>
            ) : (
              data.employee_breakdown.map((employee, index) => (
                <EmployeePerformanceCard
                  key={employee.employee_name}
                  employee={employee}
                  rank={index + 1}
                />
              ))
            )}
          </div>

          {/* Right Column: Activity Feed (1/3 width) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#323130] flex items-center gap-2">
                <Activity size={24} className="text-[#0078D4]" />
                Live Activity Feed
              </h2>
            </div>

            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {data.recent_activities.length === 0 ? (
                <div className="bg-white border border-[#E1DFDD] rounded-lg p-8 text-center">
                  <Activity size={48} className="text-[#C8C6C4] mx-auto mb-3" />
                  <p className="text-[#605E5C]">No recent activities</p>
                </div>
              ) : (
                data.recent_activities.map((activity) => (
                  <ActivityFeedCard key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F2F1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #C8C6C4;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8A8886;
        }
      `}</style>
    </div>
  );
}
