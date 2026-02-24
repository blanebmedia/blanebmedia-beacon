// Beacon Systems Registry — single source of truth for all 8 systems

export type SystemKey =
  | 'administration'
  | 'training'
  | 'products'
  | 'current_campaign'
  | 'growth'
  | 'logistics'
  | 'marketing'
  | 'finance';

export interface ChecklistDefinition {
  key: string;
  label: string;
}

export interface SystemDefinition {
  key: SystemKey;
  name: string;
  description: string;
  isCommonStartingPoint: boolean;
  /** Phase 1: only marketing & finance are fully interactive */
  isActiveInPhase1: boolean;
  checklist: ChecklistDefinition[];
}

export const SYSTEMS_REGISTRY: SystemDefinition[] = [
  {
    key: 'administration',
    name: 'Administration',
    description: 'Legal, compliance, and operational foundations.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: 'Business legally registered' },
      { key: 'item_2', label: 'Operating agreement/bylaws documented' },
      { key: 'item_3', label: 'Separate business bank account' },
      { key: 'item_4', label: 'Insurance active' },
      { key: 'item_5', label: 'Bookkeeping system in place' },
    ],
  },
  {
    key: 'training',
    name: 'Training',
    description: 'Team development, SOPs, and onboarding.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: 'Core roles documented' },
      { key: 'item_2', label: 'SOPs exist' },
      { key: 'item_3', label: 'Onboarding process defined' },
      { key: 'item_4', label: 'Performance review process' },
      { key: 'item_5', label: 'Ongoing skill development plan' },
    ],
  },
  {
    key: 'products',
    name: 'Products',
    description: 'Core offer, pricing, and product feedback loops.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: 'Core offer defined' },
      { key: 'item_2', label: 'Pricing structure defined' },
      { key: 'item_3', label: 'Cost structure/COGS known' },
      { key: 'item_4', label: 'Upsell/cross-sell identified' },
      { key: 'item_5', label: 'Customer feedback loop exists' },
    ],
  },
  {
    key: 'current_campaign',
    name: 'Current Campaign',
    description: 'Active campaign execution and measurement.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: 'Active campaign running' },
      { key: 'item_2', label: 'Campaign objective defined' },
      { key: 'item_3', label: 'Budget allocated' },
      { key: 'item_4', label: 'Metrics tracked' },
      { key: 'item_5', label: 'Monthly review cadence' },
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'Revenue goals, KPIs, and strategic planning.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: '12-month revenue goal defined' },
      { key: 'item_2', label: 'Quarterly milestones defined' },
      { key: 'item_3', label: 'KPI dashboard defined' },
      { key: 'item_4', label: 'Growth strategy documented' },
      { key: 'item_5', label: 'Risk plan defined' },
    ],
  },
  {
    key: 'logistics',
    name: 'Logistics',
    description: 'Supply chain, fulfillment, and quality control.',
    isCommonStartingPoint: false,
    isActiveInPhase1: false,
    checklist: [
      { key: 'item_1', label: 'Inventory tracking (if applicable)' },
      { key: 'item_2', label: 'Vendor agreements documented' },
      { key: 'item_3', label: 'Delivery process documented' },
      { key: 'item_4', label: 'Quality control defined' },
      { key: 'item_5', label: 'Fulfillment timeline defined' },
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'ICP, positioning, acquisition, and performance.',
    isCommonStartingPoint: true,
    isActiveInPhase1: true,
    checklist: [
      { key: 'item_1', label: 'ICP defined' },
      { key: 'item_2', label: 'Brand positioning documented' },
      { key: 'item_3', label: 'Active acquisition channel' },
      { key: 'item_4', label: 'Defined marketing budget' },
      { key: 'item_5', label: 'Monthly performance review process exists' },
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    description: 'Revenue, margins, expenses, and cash flow.',
    isCommonStartingPoint: true,
    isActiveInPhase1: true,
    checklist: [
      { key: 'item_1', label: 'Revenue tracked monthly' },
      { key: 'item_2', label: 'Gross margin known' },
      { key: 'item_3', label: 'Operating expenses categorized' },
      { key: 'item_4', label: 'EBITDA estimate calculated' },
      { key: 'item_5', label: 'Cash flow tracked monthly' },
    ],
  },
];

export function getSystemDefinition(key: SystemKey): SystemDefinition {
  const def = SYSTEMS_REGISTRY.find((s) => s.key === key);
  if (!def) throw new Error(`Unknown system key: ${key}`);
  return def;
}
