import React, { useState } from 'react';
import { Phone, Mail, Users, MapPin, Calendar, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface EmployeeStats {
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

interface EmployeePerformanceCardProps {
  employee: EmployeeStats;
  rank: number;
}

export default function EmployeePerformanceCard({ employee, rank }: EmployeePerformanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format last activity time
  const getRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return 'No activity';

    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return activityTime.toLocaleDateString();
  };

  // Get rank badge
  const getRankBadge = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bg-white border border-[#E1DFDD] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          {/* Employee info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0078D4] to-[#5A9FD4] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {employee.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#323130] text-base">
                  {employee.employee_name}
                </h3>
                <span className="text-xs font-bold text-[#8A8886]">
                  {getRankBadge()}
                </span>
              </div>
              <p className="text-xs text-[#8A8886]">
                {getRelativeTime(employee.last_activity_time)}
                {employee.last_activity_lead && ` • ${employee.last_activity_lead}`}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0078D4]">
                {employee.activities_today}
              </div>
              <div className="text-xs text-[#8A8886]">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#323130]">
                {employee.activities_this_week}
              </div>
              <div className="text-xs text-[#8A8886]">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#605E5C]">
                {employee.total_activities}
              </div>
              <div className="text-xs text-[#8A8886]">Total</div>
            </div>
            {isExpanded ? (
              <ChevronUp className="text-[#605E5C]" size={20} />
            ) : (
              <ChevronDown className="text-[#605E5C]" size={20} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-[#E1DFDD] p-4 bg-[#FAF9F8]">
          {/* Activity breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#323130] mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#0078D4]" />
              Activity Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                <Phone size={16} className="text-[#0078D4]" />
                <div>
                  <div className="text-sm font-bold text-[#323130]">{employee.calls}</div>
                  <div className="text-xs text-[#8A8886]">Calls</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                <Mail size={16} className="text-[#7719AA]" />
                <div>
                  <div className="text-sm font-bold text-[#323130]">{employee.emails}</div>
                  <div className="text-xs text-[#8A8886]">Emails</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                <Users size={16} className="text-[#107C10]" />
                <div>
                  <div className="text-sm font-bold text-[#323130]">{employee.meetings}</div>
                  <div className="text-xs text-[#8A8886]">Meetings</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                <MapPin size={16} className="text-[#D83B01]" />
                <div>
                  <div className="text-sm font-bold text-[#323130]">{employee.site_visits}</div>
                  <div className="text-xs text-[#8A8886]">Site Visits</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                <Calendar size={16} className="text-[#F59B00]" />
                <div>
                  <div className="text-sm font-bold text-[#323130]">{employee.follow_ups}</div>
                  <div className="text-xs text-[#8A8886]">Follow-ups</div>
                </div>
              </div>
              {employee.other > 0 && (
                <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#E1DFDD]">
                  <Clock size={16} className="text-[#605E5C]" />
                  <div>
                    <div className="text-sm font-bold text-[#323130]">{employee.other}</div>
                    <div className="text-xs text-[#8A8886]">Other</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lead statistics */}
          <div>
            <h4 className="text-sm font-semibold text-[#323130] mb-3">Lead Portfolio</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-[#E1DFDD] text-center">
                <div className="text-xl font-bold text-[#323130]">{employee.leads_assigned}</div>
                <div className="text-xs text-[#8A8886]">Assigned</div>
              </div>
              <div className="bg-white p-3 rounded border border-[#E1DFDD] text-center">
                <div className="text-xl font-bold text-[#0078D4]">{employee.active_leads}</div>
                <div className="text-xs text-[#8A8886]">Active</div>
              </div>
              <div className="bg-white p-3 rounded border border-[#E1DFDD] text-center">
                <div className="text-xl font-bold text-[#107C10]">{employee.closed_deals}</div>
                <div className="text-xs text-[#8A8886]">Closed</div>
              </div>
            </div>
          </div>

          {/* Last activity */}
          {employee.last_activity_description && (
            <div className="mt-4 pt-4 border-t border-[#E1DFDD]">
              <h4 className="text-sm font-semibold text-[#323130] mb-2">Last Activity</h4>
              <p className="text-sm text-[#605E5C] italic">
                &ldquo;{employee.last_activity_description}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
