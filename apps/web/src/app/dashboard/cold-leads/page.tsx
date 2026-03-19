'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadCategory } from '@/types/leads';
import AddLeadModal from '@/components/leads/AddLeadModal';
import EditLeadModal from '@/components/leads/EditLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';
import DeleteConfirmationModal from '@/components/leads/DeleteConfirmationModal';
import { Plus, Building2, Calendar, FileText, Eye, Package, Pencil, Trash2, Download, Snowflake } from 'lucide-react';
import Link from 'next/link';

const API_BASE_PATH = '/api/cold-leads';

const CATEGORIES: { value: LeadCategory; label: string }[] = [
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

function LeadActionButtons({
  lead,
  onLogActivity,
  onViewActivities,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  onLogActivity: (lead: Lead) => void;
  onViewActivities: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => onLogActivity(lead)}
        className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1 shadow-[0_0_8px_rgba(0,120,212,0.3)]"
      >
        <FileText className="w-3 h-3" />
        Log
      </button>
      <button
        onClick={() => onViewActivities(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <Eye className="w-3 h-3" />
        View
      </button>
      <button
        onClick={() => onEdit(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-white/10"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>
      <button
        onClick={() => onDelete(lead)}
        className="px-2 py-1 text-xs rounded font-medium transition-colors duration-150 flex items-center gap-1 hover:bg-red-500/20"
        style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  );
}

export default function ColdLeadsPage() {
  useAuth();
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory>('lead');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<LeadCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showViewActivitiesModal, setShowViewActivitiesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_PATH}?category=${selectedCategory}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads);
      } else {
        console.error('Failed to fetch cold leads', data.error);
      }
    } catch (error) {
      console.error('Error fetching cold leads', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const openAddFlow = () => {
    setSelectedCategoryForAdd(selectedCategory);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedCategoryForAdd(null);
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

  const handleEditSuccess = () => {
    fetchLeads();
  };

  const handleDeleteSuccess = () => {
    fetchLeads();
  };

  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`${API_BASE_PATH}/export?category=${selectedCategory}`);

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to export: ${data.error}`);
        console.error('Failed to export cold leads', data.error);
        return;
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `cold-leads-export-${Date.now()}.xlsx`;

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
      console.error('Error exporting cold leads', error);
    }
  };

  const isLeadCategory = selectedCategory === 'lead';
  const isEventCategory = selectedCategory === 'event';
  const isSupplierCategory = selectedCategory === 'supplier';
  const categoryLabel = CATEGORIES.find(c => c.value === selectedCategory)?.label || '';

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

        {/* Category Navigation */}
        <nav className="space-y-1 mb-6">
          <Link
            href="/dashboard/task-assigned"
            className="w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            <Building2 className="w-4 h-4" />
            Leads
          </Link>

          {CATEGORIES.map((category) => {
            const items = [];

            if (category.value === 'lead') {
              items.push(
                <button
                  key="cold-leads-label"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                    selectedCategory === category.value
                      ? 'text-cyan-400 border-l-4 border-cyan-400'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    color: selectedCategory === category.value ? '#7dd3fc' : 'rgba(255,255,255,0.9)',
                    backgroundColor: selectedCategory === category.value ? 'rgba(125,211,252,0.1)' : undefined,
                  }}
                >
                  <Snowflake className="w-4 h-4" />
                  Cold Leads
                </button>
              );
            } else {
              items.push(
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                    selectedCategory === category.value
                      ? 'text-cyan-400 border-l-4 border-cyan-400'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    color: selectedCategory === category.value ? '#7dd3fc' : 'rgba(255,255,255,0.9)',
                    backgroundColor: selectedCategory === category.value ? 'rgba(125,211,252,0.1)' : undefined,
                  }}
                >
                  {category.value === 'event' ? <Calendar className="w-4 h-4" /> :
                   <Package className="w-4 h-4" />}
                  {category.label}
                </button>
              );
            }

            return items;
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 min-w-0">
        <div>
          {/* Category Title Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-1">Cold {categoryLabel}</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Track your cold {categoryLabel.toLowerCase()}</p>
            </div>
            {leads.length > 0 && (
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-[#107C10] text-white rounded text-sm font-medium hover:bg-[#0B5A08] transition-colors duration-150 flex items-center gap-2 shadow-[0_0_12px_rgba(16,124,16,0.4)]"
                title={`Export Cold ${categoryLabel} to Excel`}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            )}
          </div>

        {/* Table */}
        <div className="rounded-lg overflow-x-auto" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
              <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>No cold {categoryLabel.toLowerCase()} found</p>
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full transition-colors duration-150 flex items-center justify-center group mx-auto hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                title={`Add Cold ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          ) : (
            <>
              <table className="table-auto" style={{minWidth: '1800px', width: '1800px'}}>
                <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <tr>
                    {isLeadCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Date</th>
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
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Event Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Venue</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Date</th>
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
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors duration-100">
                      {isLeadCategory && (
                        <>
                          <td className="px-2 py-2 text-xs text-white/90">
                            {lead.date_of_interaction ? new Date(lead.date_of_interaction).toLocaleDateString() : 'N/A'}
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
                            <LeadActionButtons
                              lead={lead}
                              onLogActivity={openActivityModal}
                              onViewActivities={openViewActivitiesModal}
                              onEdit={openEditModal}
                              onDelete={openDeleteModal}
                            />
                          </td>
                        </>
                      )}
                      {isEventCategory && (
                        <>
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-white/90 text-xs truncate" title={lead.event_name || ''}>{lead.event_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90 max-w-[120px]">
                            <div className="truncate" title={lead.venue || ''}>
                              {lead.venue || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-white/90">
                            {lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A'}
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
                            <LeadActionButtons
                              lead={lead}
                              onLogActivity={openActivityModal}
                              onViewActivities={openViewActivitiesModal}
                              onEdit={openEditModal}
                              onDelete={openDeleteModal}
                            />
                          </td>
                        </>
                      )}
                      {isSupplierCategory && (
                        <>
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
                            <LeadActionButtons
                              lead={lead}
                              onLogActivity={openActivityModal}
                              onViewActivities={openViewActivitiesModal}
                              onEdit={openEditModal}
                              onDelete={openDeleteModal}
                            />
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
          {!loading && leads.length > 0 && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full transition-colors duration-150 flex items-center justify-center group hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                title={`Add Cold ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && selectedCategoryForAdd && (
        <AddLeadModal
          category={selectedCategoryForAdd}
          onClose={closeAddModal}
          onSuccess={() => {
            fetchLeads();
            closeAddModal();
          }}
          apiBasePath={API_BASE_PATH}
        />
      )}
      {showActivityModal && selectedLead && (
        <LogActivityModal
          lead={selectedLead}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedLead(null);
          }}
          onSuccess={fetchLeads}
          apiBasePath={API_BASE_PATH}
        />
      )}
      {showViewActivitiesModal && selectedLead && (
        <ViewActivitiesModal
          lead={selectedLead}
          onClose={() => {
            setShowViewActivitiesModal(false);
            setSelectedLead(null);
          }}
          apiBasePath={API_BASE_PATH}
        />
      )}
      {showEditModal && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            handleEditSuccess();
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          apiBasePath={API_BASE_PATH}
        />
      )}
      {showDeleteModal && selectedLead && (
        <DeleteConfirmationModal
          lead={selectedLead}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            handleDeleteSuccess();
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
          apiBasePath={API_BASE_PATH}
        />
      )}
    </div>
  );
}
