'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadType, Pipeline, Industry } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import EditLeadModal from '@/components/leads/EditLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';
import DeleteConfirmationModal from '@/components/leads/DeleteConfirmationModal';
import { Plus, Building2, Calendar, FileText, Eye, Package, Pencil, Trash2, Download, Snowflake, ChevronDown } from 'lucide-react';

const TYPES: { value: LeadType; label: string }[] = [
  { value: 'lead', label: 'Leads' },
  { value: 'event', label: 'Events' },
  { value: 'supplier', label: 'Supplier' },
];

// Glass Status Colors (water theme)
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'not-started': { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.15)' },
  'contacted': { bg: 'rgba(125,211,252,0.15)', text: '#7dd3fc', border: 'rgba(125,211,252,0.3)' },
  'quoted': { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  'negotiating': { bg: 'rgba(192,132,252,0.15)', text: '#c084fc', border: 'rgba(192,132,252,0.3)' },
  'closed-deal': { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  'rejected': { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', border: 'rgba(248,113,113,0.3)' },
};
const DEFAULT_STATUS_STYLE = { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.15)' };

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'lgu', label: 'LGU' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'microfinance', label: 'Microfinance' },
  { value: 'foundation', label: 'Foundation' },
];

export default function LeadsPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<LeadType>('lead');
  const [coldLeadsExpanded, setColdLeadsExpanded] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showViewActivitiesModal, setShowViewActivitiesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const pipeline: Pipeline = selectedIndustry ? 'cold' : 'warm';

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: selectedType, pipeline });
      if (selectedIndustry) params.set('industry', selectedIndustry);
      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setLeads(data.leads);
      } else {
        logger.error('Failed to fetch leads', data.error);
      }
    } catch (error) {
      logger.error('Error fetching leads', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedType, selectedIndustry]);

  const openAddFlow = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const openActivityModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowActivityModal(true);
  };

  const openViewActivitiesModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewActivitiesModal(true);
  };

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowEditModal(true);
  };

  const openDeleteModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const handleExportToExcel = async () => {
    try {
      const params = new URLSearchParams({ type: selectedType, pipeline });
      if (selectedIndustry) params.set('industry', selectedIndustry);
      const response = await fetch(`/api/leads/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to export: ${data.error}`);
        logger.error('Failed to export leads', data.error);
        return;
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.xlsx`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('An error occurred while exporting');
      logger.error('Error exporting leads', error);
    }
  };

  const isLeadCategory = selectedType === 'lead';
  const isEventCategory = selectedType === 'event';
  const isSupplierCategory = selectedType === 'supplier';
  const categoryLabel = TYPES.find(c => c.value === selectedType)?.label || '';
  const displayLeads = leads;
  const displayLoading = loading;
  const apiBasePath = '/api/leads';
  const refreshData = fetchLeads;

  return (
    <div className="flex-1 flex h-full">
      {/* Sidebar Navigation - Microsoft Style */}
      <div className="w-64 border-r border-p3-cyan/20 p-6 flex flex-col bg-p3-navy-dark/30 backdrop-blur-sm">
        {/* Add Item Button - Microsoft Primary */}
        <button
          onClick={openAddFlow}
          className="w-full px-3 py-2.5 mb-6 bg-[#0078D4] text-white rounded text-sm font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,120,212,0.4)]"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>

        {/* Warm: Leads / Events / Supplier */}
        <nav className="space-y-1 mb-4">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSelectedType(t.value); setSelectedIndustry(null); }}
              className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                selectedType === t.value && !selectedIndustry
                  ? 'text-cyan-400 border-l-4 border-cyan-400'
                  : 'hover:bg-white/5'
              }`}
              style={{ color: selectedType === t.value && !selectedIndustry ? '#7dd3fc' : 'rgba(255,255,255,0.9)' }}
            >
              {t.value === 'lead' ? <Building2 className="w-4 h-4" /> :
               t.value === 'event' ? <Calendar className="w-4 h-4" /> :
               <Package className="w-4 h-4" />}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Cold Leads: by industry */}
        <div className="space-y-0.5">
          <button
            onClick={() => setColdLeadsExpanded((prev) => !prev)}
            className="w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            <Snowflake className="w-4 h-4" />
            Cold Leads
            <ChevronDown
              className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${
                coldLeadsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          {coldLeadsExpanded && (
            <div className="ml-4 space-y-0.5">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => { setSelectedType('lead'); setSelectedIndustry(ind.value); }}
                  className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors duration-150 flex items-center gap-2 ${
                    selectedIndustry === ind.value
                      ? 'text-cyan-400'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    color: selectedIndustry === ind.value ? '#7dd3fc' : 'rgba(255,255,255,0.6)',
                    backgroundColor: selectedIndustry === ind.value ? 'rgba(125,211,252,0.1)' : undefined,
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 min-w-0">
        <div>
          {/* Category Title Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-1">
                {selectedIndustry
                  ? `Cold ${categoryLabel} — ${INDUSTRIES.find(s => s.value === selectedIndustry)?.label}`
                  : categoryLabel}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {selectedIndustry
                  ? `Cold leads for ${INDUSTRIES.find(s => s.value === selectedIndustry)?.label}`
                  : `Manage and track your ${categoryLabel.toLowerCase()}`}
              </p>
            </div>
            {displayLeads.length > 0 && (
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-[#107C10] text-white rounded text-sm font-medium hover:bg-[#0B5A08] transition-colors duration-150 flex items-center gap-2 shadow-[0_0_12px_rgba(16,124,16,0.4)]"
                title={`Export ${categoryLabel} to Excel`}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            )}
          </div>

        {/* Table */}
        <div className="rounded-lg overflow-x-auto" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {displayLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
              <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Loading {categoryLabel.toLowerCase()}...</p>
            </div>
          ) : displayLeads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>No {categoryLabel.toLowerCase()} found</p>
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full transition-colors duration-150 flex items-center justify-center group mx-auto hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                title={`Add ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          ) : (
            <>
              <table className="table-auto" style={{minWidth: '1800px', width: '1800px'}}>
                <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <tr>
                    {/* Dynamic headers based on category */}
                    {isLeadCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Date Created</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Type</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Company Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}># Beneficiary</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Location</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Source</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Actions</th>
                      </>
                    )}
                    {isEventCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Date Created</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Event Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Venue</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Event Date</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Time</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Attendees</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Actions</th>
                      </>
                    )}
                    {isSupplierCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Date Created</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Supplier Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Location</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Price</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Unit</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {displayLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors duration-100">
                      {/* Dynamic row data based on category */}
                      {isLeadCategory && (
                        <>
                          <td className="px-2 py-2 text-xs text-white/90 whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">
                            <div className="truncate" title={lead.lead_type || ''}>
                              {lead.lead_type || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-white/90 text-xs truncate" title={lead.company_name || ''}>{lead.company_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.number_of_beneficiary || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.location || ''}>
                              {lead.location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.lead_source || 'N/A'}</td>
                          <td className="px-2 py-2">
                            <span className="text-xs text-white/90 capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide"
                              style={{
                                backgroundColor: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).bg,
                                color: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).text,
                                border: `1px solid ${(STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).border}`,
                              }}
                            >
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1 shadow-[0_0_8px_rgba(0,120,212,0.3)]"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-red-500/20" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {isEventCategory && (
                        <>
                          <td className="px-2 py-2 text-xs text-white/90 whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-white/90 text-xs truncate" title={lead.event_name || ''}>{lead.event_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.venue || ''}>
                              {lead.venue || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90 whitespace-nowrap">
                            {lead.event_start_date
                              ? new Date(lead.event_start_date).toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.event_time || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.number_of_attendees || 'N/A'}</td>
                          <td className="px-2 py-2">
                            <span className="text-xs text-white/90 capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide"
                              style={{
                                backgroundColor: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).bg,
                                color: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).text,
                                border: `1px solid ${(STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).border}`,
                              }}
                            >
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1 shadow-[0_0_8px_rgba(0,120,212,0.3)]"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-red-500/20" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {isSupplierCategory && (
                        <>
                          <td className="px-2 py-2 text-xs text-white/90 whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-white/90 text-xs truncate" title={lead.supplier_name || ''}>{lead.supplier_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.supplier_location || ''}>
                              {lead.supplier_location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.supplier_product || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.price || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.unit_type || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide"
                              style={{
                                backgroundColor: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).bg,
                                color: (STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).text,
                                border: `1px solid ${(STATUS_STYLES[lead.status] || DEFAULT_STATUS_STYLE).border}`,
                              }}
                            >
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1 shadow-[0_0_8px_rgba(0,120,212,0.3)]"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-red-500/20" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Add Button (shown when there are items) */}
          {!displayLoading && displayLeads.length > 0 && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full transition-colors duration-150 flex items-center justify-center group hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                title={`Add ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddLeadModal
          type={selectedType}
          pipeline={pipeline}
          industry={selectedIndustry || undefined}
          apiBasePath={apiBasePath}
          onClose={closeAddModal}
          onSuccess={() => {
            refreshData();
            closeAddModal();
          }}
        />
      )}
      {showActivityModal && selectedLead && (
        <LogActivityModal
          lead={selectedLead}
          apiBasePath={apiBasePath}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedLead(null);
          }}
          onSuccess={refreshData}
        />
      )}
      {showViewActivitiesModal && selectedLead && (
        <ViewActivitiesModal
          lead={selectedLead}
          apiBasePath={apiBasePath}
          onClose={() => {
            setShowViewActivitiesModal(false);
            setSelectedLead(null);
          }}
        />
      )}
      {showEditModal && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          apiBasePath={apiBasePath}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            refreshData();
            setShowEditModal(false);
            setSelectedLead(null);
          }}
        />
      )}
      {showDeleteModal && selectedLead && (
        <DeleteConfirmationModal
          lead={selectedLead}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
          apiBasePath={apiBasePath}
          onSuccess={() => {
            refreshData();
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
