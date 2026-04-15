import React from 'react';
import { Phone, Mail, Users, MapPin, MessageSquare, Calendar, Clock } from 'lucide-react';

interface ActivityFeedCardProps {
  activity: {
    id: string;
    employee_name: string;
    activity_type: string;
    activity_description: string;
    lead_name: string;
    lead_type: string;
    lead_status: string;
    created_at: string;
  };
}

export default function ActivityFeedCard({ activity }: ActivityFeedCardProps) {
  // Format timestamp to relative time
  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;

    return activityTime.toLocaleDateString();
  };

  // Get icon and color based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return { icon: Phone, color: 'text-[#0078D4]', bg: 'bg-[#E6F3FF]' };
      case 'email':
        return { icon: Mail, color: 'text-[#7719AA]', bg: 'bg-[#F3EBFA]' };
      case 'meeting':
        return { icon: Users, color: 'text-[#107C10]', bg: 'bg-[#E7F4E7]' };
      case 'site-visit':
        return { icon: MapPin, color: 'text-[#D83B01]', bg: 'bg-[#FCE9E4]' };
      case 'follow-up':
        return { icon: Calendar, color: 'text-[#F59B00]', bg: 'bg-[#FFF4E5]' };
      default:
        return { icon: MessageSquare, color: 'text-[#605E5C]', bg: 'bg-[#F3F2F1]' };
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lead':
        return 'bg-[#E6F3FF] text-[#0078D4]';
      case 'event':
        return 'bg-[#FFF4E5] text-[#F59B00]';
      case 'supplier':
        return 'bg-[#E7F4E7] text-[#107C10]';
      default:
        return 'bg-[#F3F2F1] text-[#605E5C]';
    }
  };

  const { icon: Icon, color, bg } = getActivityIcon(activity.activity_type);
  const relativeTime = getRelativeTime(activity.created_at);

  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-[#E1DFDD] rounded-lg hover:shadow-sm transition-shadow">
      {/* Icon */}
      <div className={`${bg} ${color} p-2.5 rounded-lg flex-shrink-0`}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#323130] text-sm">
              {activity.employee_name}
            </span>
            <span className="text-[#8A8886] text-sm">logged a</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${bg} ${color}`}>
              {activity.activity_type.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#8A8886] text-xs flex-shrink-0">
            <Clock size={12} />
            <span>{relativeTime}</span>
          </div>
        </div>

        {/* Lead info */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#605E5C] text-sm">Lead:</span>
          <span className="font-medium text-[#323130] text-sm truncate">
            {activity.lead_name}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getCategoryColor(activity.lead_type)}`}>
            {activity.lead_type}
          </span>
        </div>

        {/* Description */}
        <p className="text-[#605E5C] text-sm line-clamp-2">
          {activity.activity_description}
        </p>

        {/* Status update if present */}
        {activity.lead_status && activity.lead_status !== 'unknown' && (
          <div className="mt-2 text-xs text-[#8A8886]">
            Status: <span className="font-medium text-[#605E5C]">{activity.lead_status}</span>
          </div>
        )}
      </div>
    </div>
  );
}
