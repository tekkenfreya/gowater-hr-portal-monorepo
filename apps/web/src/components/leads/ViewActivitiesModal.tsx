'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, LeadActivity, ActivityType } from '@/types/leads';
import { logger } from '@/lib/logger';
import { X, Phone, Mail, Users, Building, ClipboardCheck, FileText, Sparkles, MapPin, User, Calendar, Loader2, CheckCircle, Package, ClipboardList } from 'lucide-react';

interface ViewActivitiesModalProps {
  lead: Lead;
  onClose: () => void;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <Phone className="w-5 h-5" />,
  email: <Mail className="w-5 h-5" />,
  meeting: <Users className="w-5 h-5" />,
  'site-visit': <Building className="w-5 h-5" />,
  'follow-up': <ClipboardCheck className="w-5 h-5" />,
  remark: <FileText className="w-5 h-5" />,
  other: <Sparkles className="w-5 h-5" />,
  'active-supplier': <CheckCircle className="w-5 h-5" />,
  'recording': <ClipboardList className="w-5 h-5" />,
  'checking': <Package className="w-5 h-5" />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'bg-[#E6F3FF] text-[#0078D4] border-[#0078D4]',
  email: 'bg-[#F0E6FF] text-[#5A2D91] border-[#8764B8]',
  meeting: 'bg-[#E6F4EA] text-[#107C10] border-[#107C10]',
  'site-visit': 'bg-[#FFF4E5] text-[#F59B00] border-[#F59B00]',
  'follow-up': 'bg-[#FFF9E6] text-[#8A5100] border-[#F59B00]',
  remark: 'bg-[#F3F2F1] text-[#605E5C] border-[#C8C6C4]',
  other: 'bg-[#FFE6F0] text-[#A4262C] border-[#D13438]',
  'active-supplier': 'bg-[#E6F4EA] text-[#107C10] border-[#107C10]',
  'recording': 'bg-[#E6F3FF] text-[#0078D4] border-[#0078D4]',
  'checking': 'bg-[#FFF4E5] text-[#F59B00] border-[#F59B00]',
};

export default function ViewActivitiesModal({ lead, onClose }: ViewActivitiesModalProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/activities?leadId=${lead.id}`);
      const data = await response.json();

      if (response.ok) {
        // Sort by created_at descending (newest first)
        const sortedActivities = data.activities.sort(
          (a: LeadActivity, b: LeadActivity) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setActivities(sortedActivities);
      } else {
        logger.error('Failed to fetch activities', data.error);
      }
    } catch (error) {
      logger.error('Error fetching activities', error);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-3xl bg-white/5 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E1DFDD] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#323130]">Activity Timeline</h2>
              <p className="text-[#605E5C] text-sm mt-1">{lead.company_name || lead.event_name}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-[#605E5C]">
                {lead.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lead.location}
                  </span>
                )}
                {lead.contact_person && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {lead.contact_person}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#605E5C] hover:text-[#323130] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F3F2F1]">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="inline-block animate-spin h-10 w-10 text-[#0078D4]" />
              <p className="mt-4 text-[#605E5C] text-sm">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-[#C8C6C4] mx-auto mb-4" />
              <p className="text-[#605E5C] text-base">No activities logged yet</p>
              <p className="text-[#8A8886] text-sm mt-2">Start logging activities to track progress on this lead</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {/* Timeline Line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-[#E1DFDD]"></div>
                  )}

                  {/* Activity Card */}
                  <div className="flex space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded bg-[#0078D4] flex items-center justify-center text-white">
                        {ACTIVITY_ICONS[activity.activity_type]}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white rounded-lg p-4 border border-[#E1DFDD]">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${ACTIVITY_COLORS[activity.activity_type]}`}>
                              {activity.activity_type.replace('-', ' ')}
                            </span>
                            {activity.status_update && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#E6F4EA] text-[#107C10] border border-[#107C10]">
                                Status updated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#605E5C]">
                            <span className="font-semibold text-[#323130]">{activity.employee_name}</span>
                            {' '}&bull;{' '}
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[#323130] whitespace-pre-wrap mb-3">{activity.activity_description}</p>

                      {/* Dates */}
                      {(activity.start_date || activity.end_date) && (
                        <div className="flex items-center space-x-4 text-xs text-[#605E5C] mb-2">
                          {activity.start_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Start: {formatDateOnly(activity.start_date)}</span>
                            </div>
                          )}
                          {activity.end_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>End: {formatDateOnly(activity.end_date)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Update */}
                      {activity.status_update && (
                        <div className="bg-[#F3F2F1] rounded p-2 border border-[#E1DFDD]">
                          <p className="text-xs text-[#605E5C]">
                            <span className="font-semibold text-[#323130]">Status changed to:</span>{' '}
                            <span className="capitalize">{activity.status_update.replace('-', ' ')}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E1DFDD] px-6 py-4 bg-white">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
