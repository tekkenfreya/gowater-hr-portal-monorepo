'use client';

import { LeadCategory } from '@/types/leads';
import { Building2, Calendar, X } from 'lucide-react';

interface LeadTypeSelectionModalProps {
  onSelect: (category: LeadCategory) => void;
  onClose: () => void;
}

export default function LeadTypeSelectionModal({ onSelect, onClose }: LeadTypeSelectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#323130]">Choose Category</h2>
            <p className="text-[#605E5C] text-sm mt-1">Select whether you&apos;re adding a lead or an event</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#605E5C] hover:text-[#323130] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side-by-side Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Lead Card */}
          <button
            onClick={() => onSelect('lead')}
            className="group p-6 border border-[#C8C6C4] rounded hover:border-[#0078D4] hover:bg-[#E6F3FF] transition-all duration-150 flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 bg-[#F3F2F1] rounded flex items-center justify-center group-hover:bg-[#0078D4] transition-colors">
              <Building2 className="w-6 h-6 text-[#605E5C] group-hover:text-white" />
            </div>
            <div>
              <div className="font-semibold text-base text-[#323130]">Lead</div>
              <div className="text-xs text-[#605E5C] mt-1">Business opportunity</div>
            </div>
          </button>

          {/* Event Card */}
          <button
            onClick={() => onSelect('event')}
            className="group p-6 border border-[#C8C6C4] rounded hover:border-[#0078D4] hover:bg-[#E6F3FF] transition-all duration-150 flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 bg-[#F3F2F1] rounded flex items-center justify-center group-hover:bg-[#0078D4] transition-colors">
              <Calendar className="w-6 h-6 text-[#605E5C] group-hover:text-white" />
            </div>
            <div>
              <div className="font-semibold text-base text-[#323130]">Event</div>
              <div className="text-xs text-[#605E5C] mt-1">Scheduled activity</div>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-[#323130] hover:bg-[#F3F2F1] border border-[#C8C6C4] rounded font-medium transition-colors duration-150"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
