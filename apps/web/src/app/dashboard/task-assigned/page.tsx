'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadCategory, LeadWithActivities } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import EditLeadModal from '@/components/leads/EditLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';
import DeleteConfirmationModal from '@/components/leads/DeleteConfirmationModal';
import { Plus, Building2, Calendar, FileText, Eye, Package, Pencil, Trash2, Download } from 'lucide-react';

const CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'lead', label: 'Leads' },
  { value: 'event', label: 'Events' },
  { value: 'supplier', label: 'Supplier' },
];

// Microsoft 365 Status Colors
const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]',
  'contacted': 'bg-[#E6F3FF] text-[#005A9E] border border-[#0078D4]',
  'quoted': 'bg-[#FFF4E5] text-[#8A5100] border border-[#F59B00]',
  'negotiating': 'bg-[#F0E6FF] text-[#5A2D91] border border-[#8764B8]',
  'closed-deal': 'bg-[#E6F4EA] text-[#0B5A10] border border-[#107C10]',
  'rejected': 'bg-[#FDE7E9] text-[#A4262C] border border-[#D13438]',
};

export default function LeadsPage() {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchLeads();
  }, [selectedCategory]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads?category=${selectedCategory}`);
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

  const openAddFlow = () => {
    // Directly open the add modal with the current category
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
    fetchLeads(); // Refresh the leads list
  };

  const handleDeleteSuccess = () => {
    fetchLeads(); // Refresh the leads list
  };

  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`/api/leads/export?category=${selectedCategory}`);

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
          className="w-full px-3 py-2.5 mb-6 bg-[#0078D4] text-white rounded text-sm font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>

        {/* Category Navigation */}
        <nav className="space-y-1 mb-6">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                selectedCategory === category.value
                  ? 'bg-[#E6F3FF] text-[#0078D4] border-l-4 border-[#0078D4]'
                  : 'text-[#323130] hover:bg-[#F3F2F1]'
              }`}
            >
              {category.value === 'lead' ? <Building2 className="w-4 h-4" /> :
               category.value === 'event' ? <Calendar className="w-4 h-4" /> :
               <Package className="w-4 h-4" />}
              {category.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 min-w-0">
        <div>
          {/* Category Title Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#323130] mb-1">{categoryLabel}</h1>
              <p className="text-[#605E5C] text-sm">Manage and track your {categoryLabel.toLowerCase()}</p>
            </div>
            {leads.length > 0 && (
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-[#107C10] text-white rounded text-sm font-medium hover:bg-[#0B5A08] transition-colors duration-150 flex items-center gap-2"
                title={`Export ${categoryLabel} to Excel`}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            )}
          </div>

        {/* Table */}
        <div className="rounded-lg border border-[#E1DFDD] overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#0078D4]"></div>
              <p className="mt-4 text-[#605E5C] text-sm">Loading {categoryLabel.toLowerCase()}...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#605E5C] text-base mb-4">No {categoryLabel.toLowerCase()} found</p>
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full bg-white border border-[#C8C6C4] hover:border-[#0078D4] hover:bg-[#F3F2F1] transition-colors duration-150 flex items-center justify-center group mx-auto"
                title={`Add ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-[#605E5C] group-hover:text-[#0078D4]" />
              </button>
            </div>
          ) : (
            <>
              <table className="table-auto" style={{minWidth: '1800px', width: '1800px'}}>
                <thead className="bg-[#F3F2F1] border-b border-[#E1DFDD]">
                  <tr>
                    {/* Dynamic headers based on category */}
                    {isLeadCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Date</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Type</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Company Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap"># Beneficiary</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Location</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Source</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Actions</th>
                      </>
                    )}
                    {isEventCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Event Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Venue</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Date</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Time</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Attendees</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Actions</th>
                      </>
                    )}
                    {isSupplierCategory && (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Supplier Name</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Location</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Product</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Price</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Unit</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Mobile</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Email</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Disposition</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide whitespace-nowrap">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1DFDD]">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F3F2F1] transition-colors duration-100">
                      {/* Dynamic row data based on category */}
                      {isLeadCategory && (
                        <>
                          <td className="px-2 py-2 text-xs text-[#323130]">
                            {lead.date_of_interaction ? new Date(lead.date_of_interaction).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">
                            <div className="truncate" title={lead.lead_type || ''}>
                              {lead.lead_type || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-[#323130] text-xs truncate" title={lead.company_name || ''}>{lead.company_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.number_of_beneficiary || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.location || ''}>
                              {lead.location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.lead_source || 'N/A'}</td>
                          <td className="px-2 py-2">
                            <span className="text-xs text-[#323130] capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
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
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-[#323130] text-xs truncate" title={lead.event_name || ''}>{lead.event_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.venue || ''}>
                              {lead.venue || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">
                            {lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.event_time || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.number_of_attendees || 'N/A'}</td>
                          <td className="px-2 py-2">
                            <span className="text-xs text-[#323130] capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
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
                          <td className="px-2 py-2 max-w-[150px]">
                            <div className="font-medium text-[#323130] text-xs truncate" title={lead.supplier_name || ''}>{lead.supplier_name || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.supplier_location || ''}>
                              {lead.supplier_location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.supplier_product || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.price || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.unit_type || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.contact_person || ''}>
                              {lead.contact_person || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[150px]">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-2 py-2 text-xs text-[#323130] max-w-[120px]">
                            <div className="truncate" title={lead.disposition || ''}>
                              {lead.disposition || '-'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-2 py-1 bg-[#0078D4] text-white text-xs rounded font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-2 py-1 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-2 py-1 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
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
          {!loading && leads.length > 0 && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={openAddFlow}
                className="w-8 h-8 rounded-full bg-white border border-[#C8C6C4] hover:border-[#0078D4] hover:bg-[#F3F2F1] transition-colors duration-150 flex items-center justify-center group"
                title={`Add ${isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}`}
              >
                <Plus className="w-4 h-4 text-[#605E5C] group-hover:text-[#0078D4]" />
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
        />
      )}
      {showViewActivitiesModal && selectedLead && (
        <ViewActivitiesModal
          lead={selectedLead}
          onClose={() => {
            setShowViewActivitiesModal(false);
            setSelectedLead(null);
          }}
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
        />
      )}
    </div>
  );
}
