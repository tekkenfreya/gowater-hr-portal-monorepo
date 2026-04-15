import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Calendar, User } from 'lucide-react';

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

interface StaleLeadsAlertProps {
  staleData: {
    total_stale: number;
    stale_leads: StaleLead[];
    by_employee: Array<{
      employee_name: string;
      stale_count: number;
      leads: StaleLead[];
    }>;
  };
  daysThreshold: number;
}

export default function StaleLeadsAlert({ staleData, daysThreshold }: StaleLeadsAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (staleData.total_stale === 0) {
    return (
      <div className="bg-gradient-to-r from-[#E7F4E7] to-[#D4EDD4] border border-[#107C10] rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#107C10] rounded-full flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#323130]">All Leads Active!</h3>
            <p className="text-sm text-[#605E5C]">
              No leads have been inactive for more than {daysThreshold} days. Great work!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate days since last activity or lead creation
  const getDaysSinceActivity = (lastActivityDate: string | undefined, createdDate: string): number => {
    const now = new Date();
    // If no activity, use creation date
    const referenceDate = new Date(lastActivityDate || createdDate);
    const diffInMs = now.getTime() - referenceDate.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  };

  // Get severity color
  const getSeverityColor = (days: number) => {
    if (days >= 60) return 'text-[#D13438] bg-[#FDE7E9]';
    if (days >= 45) return 'text-[#F59B00] bg-[#FFF4E5]';
    return 'text-[#605E5C] bg-[#F3F2F1]';
  };

  return (
    <div className="bg-gradient-to-r from-[#FFF4E5] to-[#FFE5CC] border-2 border-[#F59B00] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F59B00] rounded-full flex items-center justify-center">
              <AlertTriangle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#323130] flex items-center gap-2">
                Stale Leads Alert
                <span className="px-2 py-0.5 bg-[#D13438] text-white text-xs rounded-full font-bold">
                  {staleData.total_stale}
                </span>
              </h3>
              <p className="text-sm text-[#605E5C]">
                {staleData.total_stale} lead{staleData.total_stale !== 1 ? 's' : ''} with no activity in {daysThreshold}+ days
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="text-[#605E5C]" size={24} />
          ) : (
            <ChevronDown className="text-[#605E5C]" size={24} />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t-2 border-[#F59B00] bg-white p-4">
          {/* Group by employee */}
          <div className="space-y-4">
            {staleData.by_employee.map((employeeGroup) => (
              <div key={employeeGroup.employee_name} className="border border-[#E1DFDD] rounded-lg overflow-hidden">
                {/* Employee header */}
                <div className="bg-[#FAF9F8] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-[#605E5C]" />
                    <span className="font-semibold text-[#323130]">
                      {employeeGroup.employee_name}
                    </span>
                    <span className="px-2 py-0.5 bg-[#F59B00] text-white text-xs rounded-full font-bold">
                      {employeeGroup.stale_count}
                    </span>
                  </div>
                </div>

                {/* Leads list */}
                <div className="divide-y divide-[#E1DFDD]">
                  {employeeGroup.leads.map((lead) => {
                    const leadName = lead.company_name || lead.event_name || lead.supplier_name || 'Unknown';
                    const daysSinceActivity = getDaysSinceActivity(lead.last_activity?.created_at, lead.created_at);
                    const hasActivity = lead.activity_count > 0;

                    return (
                      <div key={lead.id} className="p-3 hover:bg-[#FAF9F8] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-[#323130] text-sm">
                                {leadName}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-medium uppercase bg-[#E6F3FF] text-[#0078D4]">
                                {lead.type}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F3F2F1] text-[#605E5C]">
                                {lead.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#8A8886]">
                              <Calendar size={12} />
                              {hasActivity ? (
                                <span>
                                  Last activity {daysSinceActivity} days ago
                                  {lead.last_activity && `: "${lead.last_activity.activity_description}"`}
                                </span>
                              ) : (
                                <span>
                                  Created {daysSinceActivity} days ago (no activity)
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-2 ${getSeverityColor(daysSinceActivity)}`}>
                            {daysSinceActivity}d ago
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="mt-4 p-3 bg-[#FAF9F8] rounded border border-[#E1DFDD]">
            <p className="text-sm text-[#605E5C]">
              <strong className="text-[#323130]">Action Required:</strong> These leads need immediate attention.
              Consider following up with assigned employees to re-engage these opportunities.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
