import { LeadType, Pipeline, Industry } from '@/types/leads';
import {
  Plus,
  Building2,
  Calendar,
  Package,
  Snowflake,
  ChevronDown,
} from 'lucide-react';

const TYPES: {
  value: LeadType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'lead', label: 'Leads', icon: Building2 },
  { value: 'event', label: 'Events', icon: Calendar },
  { value: 'supplier', label: 'Supplier', icon: Package },
];

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'lgu', label: 'LGU' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'microfinance', label: 'Microfinance' },
  { value: 'foundation', label: 'Foundation' },
];

interface Props {
  selectedType: LeadType;
  selectedPipeline: Pipeline;
  selectedIndustry: Industry | null;
  coldLeadsExpanded: boolean;
  hotLeadsExpanded: boolean;
  onAdd: () => void;
  onSelectWarm: (type: LeadType) => void;
  onSelectPipelineIndustry: (pipeline: 'cold' | 'hot', industry: Industry) => void;
  onToggleCold: () => void;
  onToggleHot: () => void;
}

interface PipelineSectionProps {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  pipeline: 'cold' | 'hot';
  activeClass: string;
  activeColor: string;
  activeBg: string;
  selectedPipeline: Pipeline;
  selectedIndustry: Industry | null;
  onSelect: (industry: Industry) => void;
}

function PipelineSection({
  label,
  icon,
  expanded,
  onToggle,
  pipeline,
  activeClass,
  activeColor,
  activeBg,
  selectedPipeline,
  selectedIndustry,
  onSelect,
}: PipelineSectionProps) {
  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 hover:bg-white/5"
        style={{ color: 'rgba(255,255,255,0.9)' }}
      >
        {icon}
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expanded && (
        <div className="ml-4 space-y-0.5">
          {INDUSTRIES.map((ind) => {
            const isActive =
              selectedPipeline === pipeline && selectedIndustry === ind.value;
            return (
              <button
                key={ind.value}
                onClick={() => onSelect(ind.value)}
                className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors duration-150 flex items-center gap-2 ${
                  isActive ? activeClass : 'hover:bg-white/5'
                }`}
                style={{
                  color: isActive ? activeColor : 'rgba(255,255,255,0.6)',
                  backgroundColor: isActive ? activeBg : undefined,
                }}
              >
                {ind.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeadsSidebar({
  selectedType,
  selectedPipeline,
  selectedIndustry,
  coldLeadsExpanded,
  hotLeadsExpanded,
  onAdd,
  onSelectWarm,
  onSelectPipelineIndustry,
  onToggleCold,
  onToggleHot,
}: Props) {
  return (
    <div className="w-64 border-r border-p3-cyan/20 p-6 flex flex-col bg-p3-navy-dark/30 backdrop-blur-sm">
      <button
        onClick={onAdd}
        className="w-full px-3 py-2.5 mb-6 bg-[#0078D4] text-white rounded text-sm font-medium hover:bg-[#005A9E] transition-colors duration-150 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,120,212,0.4)]"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>

      <nav className="space-y-1 mb-4">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = selectedPipeline === 'warm' && selectedType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onSelectWarm(t.value)}
              className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                isActive ? 'text-cyan-400 border-l-4 border-cyan-400' : 'hover:bg-white/5'
              }`}
              style={{ color: isActive ? '#7dd3fc' : 'rgba(255,255,255,0.9)' }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mb-2">
        <PipelineSection
          label="Cold Leads"
          icon={<Snowflake className="w-4 h-4" />}
          expanded={coldLeadsExpanded}
          onToggle={onToggleCold}
          pipeline="cold"
          activeClass="text-cyan-400"
          activeColor="#7dd3fc"
          activeBg="rgba(125,211,252,0.1)"
          selectedPipeline={selectedPipeline}
          selectedIndustry={selectedIndustry}
          onSelect={(ind) => onSelectPipelineIndustry('cold', ind)}
        />
      </div>

      <PipelineSection
        label="Hot Leads"
        icon={<span className="w-4 h-4 text-[#f59e0b]">🔥</span>}
        expanded={hotLeadsExpanded}
        onToggle={onToggleHot}
        pipeline="hot"
        activeClass="text-orange-400"
        activeColor="#fb923c"
        activeBg="rgba(251,146,60,0.1)"
        selectedPipeline={selectedPipeline}
        selectedIndustry={selectedIndustry}
        onSelect={(ind) => onSelectPipelineIndustry('hot', ind)}
      />
    </div>
  );
}
