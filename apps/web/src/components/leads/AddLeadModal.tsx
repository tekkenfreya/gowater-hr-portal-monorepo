'use client';

import { useState } from 'react';
import { LeadType, Pipeline, Industry, SupplierCategory, ProductType, LeadFormData } from '@/types/leads';
import { logger } from '@/lib/logger';
import { X } from 'lucide-react';

interface AddLeadModalProps {
  type: LeadType;
  pipeline?: Pipeline;
  industry?: Industry;
  supplierCategory?: SupplierCategory;
  notInterestedByDefault?: boolean;
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

const SUPPLIER_CATEGORY_OPTIONS = [
  { value: 'water-testing', label: 'Water Testing' },
  { value: 'printing-service', label: 'Printing Service' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'filters', label: 'Filters' },
];

const LEAD_TYPE_OPTIONS = [
  { value: 'company', label: 'Company/Organization' },
  { value: 'individual', label: 'Individual' },
];

const LEAD_SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral' },
  { value: 'own-leads', label: 'Own Leads' },
  { value: 'website', label: 'Website' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'events', label: 'Events' },
];

const DISPOSITION_OPTIONS = [
  { value: 'lead-generation', label: 'Lead Generation' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'sending-proposal', label: 'Sending Proposal' },
  { value: 'for-presentation', label: 'For Presentation (Meeting)' },
  { value: 'for-follow-up', label: 'For Follow up' },
  { value: 'interested', label: 'Interested' },
  { value: 'for-deposit', label: 'For Deposit' },
  { value: 'for-fabrication', label: 'For Fabrication and Materials Purchase' },
  { value: 'for-delivery', label: 'For Delivery' },
  { value: 'for-negotiation', label: 'For Further Negotiation' },
];

export default function AddLeadModal({ type, pipeline = 'warm', industry, supplierCategory, notInterestedByDefault = false, onClose, onSuccess, apiBasePath = '/api/leads' }: AddLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    type,
    pipeline,
    industry,
    lead_type: pipeline === 'cold' ? '' : 'company',
    company_name: '',
    contact_person: '',
    number_of_beneficiary: '',
    location: '',
    lead_source: '',
    event_name: '',
    event_type: '',
    venue: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    event_lead: '',
    number_of_attendees: '',
    event_report: '',
    supplier_name: '',
    supplier_location: '',
    supplier_product: '',
    price: '',
    unit_type: '',
    supplier_category: supplierCategory,
    mobile_number: '',
    email_address: '',
    product: undefined,
    status: type === 'event' ? 'pending' : 'not-started',
    remarks: '',
    disposition: '',
    assigned_to: '',
    participation: '',
    not_interested: notInterestedByDefault,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on category
    if (type === 'lead' && (pipeline === 'cold' || formData.lead_type === 'company') && !formData.company_name?.trim()) {
      alert(`${entityNameLabel} is required`);
      return;
    }

    if (type === 'event' && !formData.event_name?.trim()) {
      alert('Event name is required for events');
      return;
    }

    if (type === 'supplier' && !formData.supplier_name?.trim()) {
      alert('Supplier name is required for supplier');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(formatServerError(data, `Failed to create ${type}`));
        logger.error(`Failed to create ${type}`, data);
      }
    } catch (error) {
      alert(`Network error while creating ${type}. Please check your connection and try again.`);
      logger.error(`Error creating ${type}`, error);
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

  const isLead = type === 'lead';
  const isEvent = type === 'event';
  const isSupplier = type === 'supplier';
  const modalTitle = isLead ? 'Add New Lead' : isEvent ? 'Add New Event' : 'Add New Supplier';
  const submitButtonText = loading ? 'Creating...' : isLead ? 'Create Lead' : isEvent ? 'Create Event' : 'Create Supplier';

  const entityNameLabel =
    industry === 'restaurants' ? 'Restaurant Name' :
    industry === 'lgu' ? 'LGU Name' :
    industry === 'hotel' ? 'Hotel Name' :
    industry === 'foundation' ? 'Foundation Name' :
    industry === 'property-development' ? 'Property Name' :
    industry === 'hospital' ? 'Hospital Name' :
    industry === 'schools' ? 'School Name' :
    industry === 'offices' ? 'Office Name' :
    industry === 'household' ? 'Customer Name' :
    industry === 'microfinance' ? 'Company Name' :
    industry === 'sme' ? 'Company Name' :
    'Company/Organization Name';

  const hideBeneficiary = industry !== undefined && [
    'restaurants', 'lgu', 'hotel',
    'property-development', 'hospital', 'offices', 'household',
  ].includes(industry);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E1DFDD] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#323130]">{modalTitle}</h2>
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
              {/* Lead Type - hidden for cold leads */}
              {pipeline !== 'cold' && (
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Type</label>
                  <select
                    name="lead_type"
                    value={formData.lead_type || 'company'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  >
                    {LEAD_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Entity name - label varies by industry */}
              {(pipeline === 'cold' || formData.lead_type === 'company') && (
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
              )}

              {/* Name (Contact Person & Designation) */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Name (Contact Person & Designation)</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., John Doe - Manager"
                />
              </div>

              {/* Number of Beneficiary - hidden for Restaurants/LGU/Hotel/Property Dev/Hospital/Offices/Household; renamed to "Members" for Microfinance */}
              {(pipeline === 'cold' || formData.lead_type === 'company') && !hideBeneficiary && (
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                    {industry === 'microfinance' ? 'Members' : 'Number of Beneficiary'}
                  </label>
                  <input
                    type="text"
                    name="number_of_beneficiary"
                    value={formData.number_of_beneficiary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                    placeholder={industry === 'microfinance' ? 'e.g., 200, 1000-5000' : 'e.g., 50, 100-200'}
                  />
                </div>
              )}

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

              {/* Contact # */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Contact #</label>
                <input
                  type="text"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter contact number"
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

              {/* Lead Source */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Lead Source</label>
                <select
                  name="lead_source"
                  value={formData.lead_source || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  <option value="">Select lead source</option>
                  {LEAD_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Interest */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Product Interest</label>
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

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned To */}
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

              {/* Disposition */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Disposition</label>
                <select
                  name="disposition"
                  value={formData.disposition || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  <option value="">Select disposition</option>
                  {DISPOSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

              {/* Type of Event */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Type of Event</label>
                <input
                  type="text"
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., Conference, Trade Show, Corporate Event"
                />
              </div>

              {/* Event Start Date - Event End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Start Date</label>
                  <input
                    type="date"
                    name="event_start_date"
                    value={formData.event_start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event End Date</label>
                  <input
                    type="date"
                    name="event_end_date"
                    value={formData.event_end_date}
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

              {/* Event Lead */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Lead</label>
                <input
                  type="text"
                  name="event_lead"
                  value={formData.event_lead}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter event lead/organizer name"
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

          {/* SUPPLIER FIELDS */}
          {isSupplier && (
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

              {/* Supplier Category */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Category</label>
                <select
                  name="supplier_category"
                  value={formData.supplier_category || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                >
                  <option value="">Select category</option>
                  {SUPPLIER_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* SHARED FIELDS (used by events and supplier only - leads has its own fields) */}
          {!isLead && (
            <>
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

          {/* Contact Number / Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">
              {isEvent ? 'Contact Number' : 'Mobile Number'}
            </label>
            <input
              type="text"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder={isEvent ? 'Enter contact number' : 'Enter mobile number'}
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

          {/* Product (only for lead and event, not supplier) */}
          {!isSupplier && (
            <div>
              <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                {isLead ? 'Product Interest' : 'Product to Showcase'}
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
              {(isEvent ? EVENT_STATUS_OPTIONS : STATUS_OPTIONS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Event Report Upload (Events only) or Remarks (Supplier only) */}
          {isEvent ? (
            <div>
              <label className="block text-sm font-semibold text-[#323130] mb-1.5">Upload Event Report</label>
              <input
                type="file"
                name="event_report"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // For now, store file name. In production, upload to server first
                    setFormData({ ...formData, event_report: file.name });
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#F3F2F1] file:text-[#323130] hover:file:bg-[#E1DFDD]"
              />
              <p className="mt-1 text-xs text-[#605E5C]">Accepted: PDF, Word, Excel, Images</p>
            </div>
          ) : (
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
          )}

            </>
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
