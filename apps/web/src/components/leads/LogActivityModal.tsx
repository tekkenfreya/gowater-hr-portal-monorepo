'use client';

import { useState } from 'react';
import { Lead, ActivityType, ActivityFormData } from '@/types/leads';
import { X, Phone, Mail, Users, Building, ClipboardCheck, FileText, Sparkles, Info, CheckCircle, Package, ClipboardList } from 'lucide-react';

interface LogActivityModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  apiBasePath?: string;
}

// Activity types for Lead and Event categories
const LEAD_EVENT_ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: 'call', label: 'Phone Call', icon: <Phone className="w-5 h-5" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-5 h-5" /> },
  { value: 'meeting', label: 'Meeting', icon: <Users className="w-5 h-5" /> },
  { value: 'site-visit', label: 'Site Visit', icon: <Building className="w-5 h-5" /> },
  { value: 'follow-up', label: 'Follow-up', icon: <ClipboardCheck className="w-5 h-5" /> },
  { value: 'remark', label: 'Remark', icon: <FileText className="w-5 h-5" /> },
  { value: 'other', label: 'Other', icon: <Sparkles className="w-5 h-5" /> },
];

// Activity types for Supplier category
const SUPPLIER_ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: 'active-supplier', label: 'Active supplier', icon: <CheckCircle className="w-5 h-5" /> },
  { value: 'recording', label: 'For recording purposes', icon: <ClipboardList className="w-5 h-5" /> },
  { value: 'checking', label: 'For checking', icon: <Package className="w-5 h-5" /> },
];

const STATUS_OPTIONS = [
  { value: '', label: 'No status change' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed', label: 'Closed Deal' },
  { value: 'rejected', label: 'Rejected' },
];

export default function LogActivityModal({ lead, onClose, onSuccess, apiBasePath = '/api/leads' }: LogActivityModalProps) {
  // Determine which activity types to show based on lead category
  const activityTypes = lead.category === 'supplier' ? SUPPLIER_ACTIVITY_TYPES : LEAD_EVENT_ACTIVITY_TYPES;
  const defaultActivityType = lead.category === 'supplier' ? 'active-supplier' : 'call';

  const [formData, setFormData] = useState<ActivityFormData>({
    activity_type: defaultActivityType as ActivityType,
    activity_description: '',
    start_date: '',
    end_date: '',
    status_update: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activity_description.trim()) {
      alert('Activity description is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiBasePath}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          ...formData,
          status_update: formData.status_update || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to log activity: ${data.error}`);
        console.error('Failed to log activity', data.error);
      }
    } catch (error) {
      alert('An error occurred while logging the activity');
      console.error('Error logging activity', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 backdrop-blur-3xl bg-white/5 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E1DFDD] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#323130]">Log Activity</h2>
              <p className="text-[#605E5C] text-sm mt-1">{lead.company_name || lead.event_name || lead.supplier_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#605E5C] hover:text-[#323130] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-2">
              Activity Type <span className="text-[#D13438]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, activity_type: type.value }))}
                  className={`p-3 border rounded text-left transition-colors ${
                    formData.activity_type === type.value
                      ? 'border-[#0078D4] bg-[#E6F3FF] text-[#0078D4]'
                      : 'border-[#C8C6C4] hover:border-[#8A8886] text-[#323130]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {type.icon}
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Description */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">
              Activity Description <span className="text-[#D13438]">*</span>
            </label>
            <textarea
              name="activity_description"
              value={formData.activity_description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent resize-none text-[#323130]"
              placeholder="Describe what you did... (e.g., 'Called Mr. Santos to discuss pricing for 3 vending machines. He requested a formal quote by Friday.')"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">End Date (Optional)</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            />
          </div>

          {/* Status Update */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Update Lead Status</label>
            <select
              name="status_update"
              value={formData.status_update}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[#605E5C]">
              You can also update the lead status here
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-[#F3F2F1] border border-[#E1DFDD] rounded p-3">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-[#605E5C] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#323130]">This gets logged</p>
                <p className="text-xs text-[#605E5C] mt-1">
                  Your name and timestamp will be recorded. Managers can view all activities from the dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#C8C6C4] text-[#323130] rounded font-medium hover:bg-[#F3F2F1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
