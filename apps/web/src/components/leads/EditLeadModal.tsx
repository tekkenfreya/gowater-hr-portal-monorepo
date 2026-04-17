'use client';

import { useState } from 'react';
import { Lead, ProductType, LeadFormData } from '@/types/leads';
import { logger } from '@/lib/logger';
import { X } from 'lucide-react';

interface EditLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  apiBasePath?: string;
}

const PRODUCT_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'both', label: 'Both (Vending + Dispenser)' },
  { value: 'vending', label: 'Vending Machine' },
  { value: 'dispenser', label: 'Water Dispenser' },
];

const UNIT_TYPE_OPTIONS = [
  { value: 'per-piece', label: 'Per Piece' },
  { value: 'per-box', label: 'Per Box' },
  { value: 'per-unit', label: 'Per Unit' },
  { value: 'per-kg', label: 'Per Kilogram' },
  { value: 'per-liter', label: 'Per Liter' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed-deal', label: 'Closed Deal' },
  { value: 'rejected', label: 'Rejected' },
];

const EVENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'attended', label: 'Attended' },
];

const PARTICIPATION_OPTIONS = [
  { value: 'exhibitor', label: 'Exhibitor' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'none', label: 'None' },
];

export default function EditLeadModal({ lead, onClose, onSuccess, apiBasePath = '/api/leads' }: EditLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    type: lead.type,
    // LEAD FIELDS
    lead_type: lead.lead_type || '',
    company_name: lead.company_name || '',
    number_of_beneficiary: lead.number_of_beneficiary || '',
    location: lead.location || '',
    lead_source: lead.lead_source || '',
    // EVENT FIELDS
    event_name: lead.event_name || '',
    venue: lead.venue || '',
    event_start_date: lead.event_start_date || '',
    event_end_date: lead.event_end_date || '',
    event_time: lead.event_time || '',
    number_of_attendees: lead.number_of_attendees || '',
    // SUPPLY FIELDS
    supplier_name: lead.supplier_name || '',
    supplier_location: lead.supplier_location || '',
    supplier_product: lead.supplier_product || '',
    price: lead.price || '',
    unit_type: lead.unit_type || '',
    // SHARED FIELDS
    contact_person: lead.contact_person || '',
    mobile_number: lead.mobile_number || '',
    email_address: lead.email_address || '',
    product: lead.product || undefined,
    status: lead.status || 'not-started',
    remarks: lead.remarks || '',
    disposition: lead.disposition || '',
    assigned_to: lead.assigned_to || '',
    participation: lead.participation || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on category
    if (lead.type === 'lead' && !formData.company_name?.trim()) {
      alert(`${entityNameLabel} is required`);
      return;
    }

    if (lead.type === 'event' && !formData.event_name?.trim()) {
      alert('Event name is required for events');
      return;
    }

    if (lead.type === 'supplier' && !formData.supplier_name?.trim()) {
      alert('Supplier name is required for suppliers');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(apiBasePath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(formatServerError(data, `Failed to update ${lead.type}`));
        logger.error(`Failed to update ${lead.type}`, data);
      }
    } catch (error) {
      alert(`Network error while updating ${lead.type}. Please check your connection and try again.`);
      logger.error(`Error updating ${lead.type}`, error);
    } finally {
      setLoading(false);
    }
  };

  const formatServerError = (data: { error?: string; details?: Record<string, string[]> }, fallback: string): string => {
    if (data?.details) {
      const lines = Object.entries(data.details).map(([field, msgs]) => `• ${field}: ${msgs.join(', ')}`);
      if (lines.length > 0) return `${fallback}:\n\n${lines.join('\n')}`;
    }
    return data?.error ? `${fallback}: ${data.error}` : fallback;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isLead = lead.type === 'lead';
  const isEvent = lead.type === 'event';
  const isSupply = lead.type === 'supplier';
  const modalTitle = isLead ? 'Edit Lead' : isEvent ? 'Edit Event' : 'Edit Supplier';
  const submitButtonText = loading ? 'Saving...' : 'Save Changes';

  // Get the display name for the entity
  const entityName = isLead
    ? lead.company_name
    : isEvent
    ? lead.event_name
    : lead.supplier_name;

  const entityNameLabel =
    lead.industry === 'restaurants' ? 'Restaurant Name' :
    lead.industry === 'lgu' ? 'LGU Name' :
    lead.industry === 'hotel' ? 'Hotel Name' :
    lead.industry === 'foundation' ? 'Foundation Name' :
    'Company Name';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E1DFDD] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#323130]">{modalTitle}</h2>
              <p className="text-[#605E5C] text-sm mt-1">{entityName}</p>
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
          {/* LEAD FIELDS */}
          {isLead && (
            <>
              {/* Entity name - label varies by industry */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  {entityNameLabel} <span className="text-[#D13438]">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder={`Enter ${entityNameLabel.toLowerCase()}`}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter location"
                />
              </div>

              {/* Lead Type - hidden for cold leads */}
              {lead.pipeline !== 'cold' && (
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Lead Type</label>
                  <input
                    type="text"
                    name="lead_type"
                    value={formData.lead_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                    placeholder="e.g., Company/Organization, Individual"
                  />
                </div>
              )}

              {/* Number of Beneficiary - hidden for Restaurants/LGU/Hotel; renamed to "Members" for Microfinance */}
              {lead.industry !== 'restaurants' &&
                lead.industry !== 'lgu' &&
                lead.industry !== 'hotel' && (
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  {lead.industry === 'microfinance' ? 'Members' : 'Number of Beneficiary'}
                </label>
                <input
                  type="text"
                  name="number_of_beneficiary"
                  value={formData.number_of_beneficiary}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder={lead.industry === 'microfinance' ? 'Enter number of members' : 'Enter number of beneficiaries'}
                />
              </div>
              )}

              {/* Lead Source */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Lead Source</label>
                <input
                  type="text"
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., Referral, Website, Cold Call"
                />
              </div>
            </>
          )}

          {/* EVENT FIELDS */}
          {isEvent && (
            <>
              {/* Event Name */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  Event Name <span className="text-[#D13438]">*</span>
                </label>
                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter event name"
                />
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter venue location"
                />
              </div>

              {/* Event Start / End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Start Date</label>
                  <input
                    type="date"
                    name="event_start_date"
                    value={formData.event_start_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event End Date</label>
                  <input
                    type="date"
                    name="event_end_date"
                    value={formData.event_end_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  />
                </div>
              </div>

              {/* Event Time */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Time</label>
                <input
                  type="time"
                  name="event_time"
                  value={formData.event_time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                />
              </div>

              {/* Number of Attendees */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Number of Attendees</label>
                <input
                  type="text"
                  name="number_of_attendees"
                  value={formData.number_of_attendees}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., 200-300, 500+"
                />
              </div>

              {/* Participation */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Participation</label>
                <select
                  name="participation"
                  value={formData.participation || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  <option value="">Select participation</option>
                  {PARTICIPATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* SUPPLY FIELDS */}
          {isSupply && (
            <>
              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  Supplier Name <span className="text-[#D13438]">*</span>
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter supplier name"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Location</label>
                <input
                  type="text"
                  name="supplier_location"
                  value={formData.supplier_location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter supplier location"
                />
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Product</label>
                <input
                  type="text"
                  name="supplier_product"
                  value={formData.supplier_product}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter product/item"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Price</label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter price (e.g., $10.00)"
                />
              </div>

              {/* Unit Type */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Unit Type</label>
                <select
                  name="unit_type"
                  value={formData.unit_type || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  <option value="">Select unit type</option>
                  {UNIT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* SHARED FIELDS (used by leads, events, and supplies) */}

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Contact Person</label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter contact person name"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Mobile Number</label>
            <input
              type="text"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter mobile number"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Email Address</label>
            <input
              type="email"
              name="email_address"
              value={formData.email_address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter email address"
            />
          </div>

          {/* Product (only for lead and event, not supply) */}
          {!isSupply && (
            <div>
              <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                {isLead ? 'Product Interest' : 'Product Needed'}
              </label>
              <select
                name="product"
                value={formData.product || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              >
                <option value="">Select product</option>
                {PRODUCT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            >
              {(lead.type === 'event' ? EVENT_STATUS_OPTIONS : STATUS_OPTIONS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To - hidden for events */}
          {!isEvent && (
            <div>
              <label className="block text-sm font-semibold text-[#323130] mb-1.5">Assign To</label>
              <input
                type="text"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                placeholder="Leave blank to auto-assign to yourself"
              />
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent resize-none text-[#323130]"
              placeholder="Any notes or comments"
            />
          </div>

          {/* Disposition - hidden for events */}
          {!isEvent && (
            <div>
              <label className="block text-sm font-semibold text-[#323130] mb-1.5">Disposition</label>
              <textarea
                name="disposition"
                value={formData.disposition}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent resize-none text-[#323130]"
                placeholder={isLead ? 'Current disposition for this lead' : 'Current status with this supplier'}
              />
            </div>
          )}

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
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
