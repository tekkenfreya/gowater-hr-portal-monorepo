'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadType, Pipeline, Industry, SupplierCategory } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import EditLeadModal from '@/components/leads/EditLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';
import DeleteConfirmationModal from '@/components/leads/DeleteConfirmationModal';
import { Download } from 'lucide-react';
import LeadsSidebar from './_components/LeadsSidebar';
import LeadsTable from './_components/LeadsTable';
import {
  getLeadColumns,
  getEventColumns,
  getSupplierColumns,
} from './_config/columns';

const INDUSTRY_LABELS: Record<Industry, string> = {
  restaurants: 'Restaurants',
  lgu: 'LGU',
  hotel: 'Hotel',
  microfinance: 'Microfinance',
  foundation: 'Foundation',
};

const CATEGORY_LABELS: Record<LeadType, { plural: string; singular: string }> = {
  lead: { plural: 'Leads', singular: 'Lead' },
  event: { plural: 'Events', singular: 'Event' },
  supplier: { plural: 'Supplier', singular: 'Supplier' },
};

const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  'water-testing': 'Water Testing',
  'printing-service': 'Printing Service',
  'logistics': 'Logistics',
  'filters': 'Filters',
};

const API_BASE_PATH = '/api/leads';

export default function LeadsPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<LeadType>('lead');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline>('warm');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedSupplierCategory, setSelectedSupplierCategory] = useState<SupplierCategory | null>(null);
  const [coldLeadsExpanded, setColdLeadsExpanded] = useState(false);
  const [hotLeadsExpanded, setHotLeadsExpanded] = useState(false);
  const [supplierExpanded, setSupplierExpanded] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showViewActivitiesModal, setShowViewActivitiesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const pipeline: Pipeline = selectedPipeline;

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: selectedType, pipeline });
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedSupplierCategory) params.set('supplier_category', selectedSupplierCategory);
      const response = await fetch(`${API_BASE_PATH}?${params.toString()}`);
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
  }, [selectedType, selectedPipeline, selectedIndustry, selectedSupplierCategory]);

  const handleExportToExcel = async () => {
    try {
      const params = new URLSearchParams({ type: selectedType, pipeline });
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedSupplierCategory) params.set('supplier_category', selectedSupplierCategory);
      const response = await fetch(`${API_BASE_PATH}/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to export: ${data.error}`);
        logger.error('Failed to export leads', data.error);
        return;
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.xlsx`;

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

  const openAddFlow = () => setShowAddModal(true);
  const closeAddModal = () => setShowAddModal(false);

  const handlers = {
    onLog: (lead: Lead) => {
      setSelectedLead(lead);
      setShowActivityModal(true);
    },
    onView: (lead: Lead) => {
      setSelectedLead(lead);
      setShowViewActivitiesModal(true);
    },
    onEdit: (lead: Lead) => {
      setSelectedLead(lead);
      setShowEditModal(true);
    },
    onDelete: (lead: Lead) => {
      setSelectedLead(lead);
      setShowDeleteModal(true);
    },
  };

  const columns =
    selectedType === 'event'
      ? getEventColumns(handlers)
      : selectedType === 'supplier'
      ? getSupplierColumns(handlers)
      : getLeadColumns(handlers, selectedPipeline, selectedIndustry);

  const { plural: categoryLabel, singular: singularLabel } = CATEGORY_LABELS[selectedType];
  const industryLabel = selectedIndustry ? INDUSTRY_LABELS[selectedIndustry] : null;
  const supplierCategoryLabel = selectedSupplierCategory ? SUPPLIER_CATEGORY_LABELS[selectedSupplierCategory] : null;
  const pipelineLabel = selectedPipeline === 'hot' ? 'Hot' : 'Cold';

  return (
    <div className="flex-1 flex h-full">
      <LeadsSidebar
        selectedType={selectedType}
        selectedPipeline={selectedPipeline}
        selectedIndustry={selectedIndustry}
        selectedSupplierCategory={selectedSupplierCategory}
        coldLeadsExpanded={coldLeadsExpanded}
        hotLeadsExpanded={hotLeadsExpanded}
        supplierExpanded={supplierExpanded}
        onAdd={openAddFlow}
        onSelectWarm={(type) => {
          setSelectedType(type);
          setSelectedPipeline('warm');
          setSelectedIndustry(null);
          setSelectedSupplierCategory(null);
        }}
        onSelectSupplierCategory={(category) => {
          setSelectedType('supplier');
          setSelectedPipeline('warm');
          setSelectedIndustry(null);
          setSelectedSupplierCategory(category);
        }}
        onSelectPipelineIndustry={(p, industry) => {
          setSelectedType('lead');
          setSelectedPipeline(p);
          setSelectedIndustry(industry);
          setSelectedSupplierCategory(null);
        }}
        onToggleCold={() => setColdLeadsExpanded((prev) => !prev)}
        onToggleHot={() => setHotLeadsExpanded((prev) => !prev)}
        onToggleSupplier={() => setSupplierExpanded((prev) => !prev)}
      />

      <div className="flex-1 p-8 min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-1">
              {industryLabel
                ? `${pipelineLabel} ${categoryLabel} — ${industryLabel}`
                : supplierCategoryLabel
                ? `Supplier — ${supplierCategoryLabel}`
                : categoryLabel}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {industryLabel
                ? `${pipelineLabel} leads for ${industryLabel}`
                : supplierCategoryLabel
                ? `${supplierCategoryLabel} suppliers`
                : `Manage and track your ${categoryLabel.toLowerCase()}`}
            </p>
          </div>
          {leads.length > 0 && (
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

        <LeadsTable
          columns={columns}
          leads={leads}
          loading={loading}
          categoryLabel={categoryLabel}
          singularLabel={singularLabel}
          onAdd={openAddFlow}
        />
      </div>

      {showAddModal && (
        <AddLeadModal
          type={selectedType}
          pipeline={pipeline}
          industry={selectedIndustry || undefined}
          supplierCategory={selectedSupplierCategory || undefined}
          apiBasePath={API_BASE_PATH}
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
          apiBasePath={API_BASE_PATH}
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
          apiBasePath={API_BASE_PATH}
          onClose={() => {
            setShowViewActivitiesModal(false);
            setSelectedLead(null);
          }}
        />
      )}
      {showEditModal && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          apiBasePath={API_BASE_PATH}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            fetchLeads();
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
          apiBasePath={API_BASE_PATH}
          onSuccess={() => {
            fetchLeads();
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
