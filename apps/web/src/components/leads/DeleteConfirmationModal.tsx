'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/types/leads';
import { logger } from '@/lib/logger';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  apiBasePath?: string;
}

export default function DeleteConfirmationModal({ lead, onClose, onSuccess, apiBasePath = '/api/leads' }: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Get the display name based on category
  const entityName =
    lead.category === 'lead'
      ? lead.company_name
      : lead.category === 'event'
      ? lead.event_name
      : lead.supplier_name;

  const entityType =
    lead.category === 'lead' ? 'lead' : lead.category === 'event' ? 'event' : 'supplier';

  // Fetch activity count on mount
  useEffect(() => {
    const fetchActivityCount = async () => {
      try {
        setLoadingActivities(true);
        const response = await fetch(`${apiBasePath}/activities?leadId=${lead.id}`);
        const data = await response.json();

        if (response.ok) {
          setActivityCount(data.activities.length);
        } else {
          logger.error('Failed to fetch activities', data.error);
          setActivityCount(0);
        }
      } catch (error) {
        logger.error('Error fetching activities', error);
        setActivityCount(0);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivityCount();
  }, [lead.id, apiBasePath]);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiBasePath}?id=${lead.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to delete ${entityType}: ${data.error}`);
        logger.error(`Failed to delete ${entityType}`, data.error);
      }
    } catch (error) {
      alert(`An error occurred while deleting the ${entityType}`);
      logger.error(`Error deleting ${entityType}`, error);
    } finally {
      setLoading(false);
    }
  };

  const isConfirmValid = confirmText === 'DELETE';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b border-[#E1DFDD] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-[#D13438]" />
              <h2 className="text-xl font-semibold text-[#323130]">Confirm Deletion</h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#605E5C] hover:text-[#323130] transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-[#FFF4CE] border border-[#F59B00] rounded p-4">
            <p className="text-sm text-[#323130] font-medium">
              This will permanently delete the following {entityType}:
            </p>
            <p className="text-sm text-[#323130] font-semibold mt-1">&quot;{entityName}&quot;</p>
          </div>

          {/* Activity Count Warning */}
          {loadingActivities ? (
            <div className="flex items-center justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0078D4]"></div>
              <span className="ml-2 text-sm text-[#605E5C]">Checking activities...</span>
            </div>
          ) : activityCount !== null && activityCount > 0 ? (
            <div className="bg-[#FEF0F1] border border-[#D13438] rounded p-4">
              <p className="text-sm text-[#A4262C] font-medium">
                ⚠️ This will also permanently delete {activityCount}{' '}
                {activityCount === 1 ? 'activity' : 'activities'} associated with this {entityType}.
              </p>
            </div>
          ) : (
            <div className="bg-[#F3F2F1] border border-[#C8C6C4] rounded p-4">
              <p className="text-sm text-[#605E5C]">No activities found for this {entityType}.</p>
            </div>
          )}

          {/* Confirmation Instructions */}
          <div>
            <p className="text-sm text-[#323130] font-semibold mb-2">
              This action cannot be undone. Type <span className="text-[#D13438]">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#D13438] focus:border-transparent text-[#323130]"
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-[#E1DFDD] px-6 py-4">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-[#C8C6C4] text-[#323130] rounded font-medium hover:bg-[#F3F2F1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || !isConfirmValid || loadingActivities}
              className="flex-1 px-4 py-2 bg-[#D13438] text-white rounded font-semibold hover:bg-[#A4262C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
