export interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  processed: boolean;
  metadata?: Record<string, any>;
}

export interface OGSMComponent {
  id: string;
  document_id?: string;
  component_type: 'objective' | 'goal' | 'strategy' | 'measure';
  title: string;
  description?: string;
  parent_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface KPICategory {
  id: string;
  name: string;
  description?: string;
  color?: string;  // Hex color for UI theming (e.g., '#3B82F6')
  icon?: string;  // Icon name (e.g., 'TrendingUp', 'DollarSign')
  order_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPI {
  id: string;
  ogsm_component_id?: string;
  category_id?: string;  // Reference to KPICategory
  name: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  status: 'on_track' | 'at_risk' | 'off_track';
  ownership?: string;  // Primary owner (formerly "lead")
  persons_responsible?: string[];  // Secondary team members
  owner_email?: string;  // Email for notifications (keep for backward compatibility)
  created_at: string;
  updated_at: string;
}

export interface KPIHistory {
  id: string;
  kpi_id: string;
  value: number;
  recorded_date: string;
  notes?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  message: string;
  context?: Record<string, any>;
  created_at: string;
}

export interface Report {
  id: string;
  report_type: '30_day' | '60_day' | '90_day' | 'weekly' | 'custom';
  title: string;
  content: string;
  generated_by: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AnalysisResponse {
  analysis: string;
  recommendations?: string[];
  insights?: {
    strengths?: string[];
    gaps?: string[];
    priorities?: string[];
  };
}

// Strategic Planning Types

export interface Risk {
  id: string;
  ogsm_component_id?: string;
  title: string;
  description?: string;
  category?: 'strategic' | 'operational' | 'financial' | 'compliance' | 'reputational' | 'technology';
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  risk_score?: number;
  status: 'identified' | 'assessing' | 'mitigating' | 'monitoring' | 'closed';
  mitigation_strategy?: string;
  contingency_plan?: string;
  owner_email?: string;
  review_date?: string;
  residual_likelihood?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  residual_impact?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Initiative {
  id: string;
  ogsm_component_id?: string;
  title: string;
  description?: string;
  objective?: string;
  status: 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  completion_percentage: number;
  budget_allocated?: number;
  budget_spent: number;
  owner_email?: string;
  team_members?: string[];
  expected_benefits?: string;
  success_criteria?: string;
  dependencies?: string;
  risks?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InitiativeMilestone {
  id: string;
  initiative_id: string;
  title: string;
  description?: string;
  target_date: string;
  completed: boolean;
  completed_date?: string;
  deliverables?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InitiativeKPI {
  id: string;
  initiative_id: string;
  kpi_id: string;
  target_impact_description?: string;
  created_at: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  scenario_type: 'best_case' | 'worst_case' | 'most_likely' | 'custom';
  assumptions?: string;
  is_baseline: boolean;
  probability?: number;
  status: 'draft' | 'active' | 'archived';
  created_by?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ScenarioKPIProjection {
  id: string;
  scenario_id: string;
  kpi_id: string;
  projected_value: number;
  projection_date: string;
  confidence_level?: 'low' | 'medium' | 'high';
  assumptions?: string;
  notes?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  ogsm_component_id?: string;
  initiative_id?: string;
  budget_name: string;
  description?: string;
  budget_type: 'project' | 'operational' | 'capital' | 'discretionary';
  fiscal_year?: number;
  fiscal_quarter?: number;
  allocated_amount: number;
  spent_amount: number;
  committed_amount: number;
  remaining_amount?: number;
  variance_amount?: number;
  variance_percentage?: number;
  status: 'draft' | 'active' | 'depleted' | 'closed';
  owner_email?: string;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BudgetTransaction {
  id: string;
  budget_id: string;
  transaction_type: 'allocation' | 'expenditure' | 'commitment' | 'adjustment' | 'refund';
  amount: number;
  transaction_date: string;
  description?: string;
  category?: string;
  reference_number?: string;
  approved_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Resource {
  id: string;
  resource_name: string;
  resource_type: 'human' | 'equipment' | 'facility' | 'software' | 'consultant' | 'other';
  description?: string;
  department?: string;
  email?: string;
  skills?: string[];
  capacity_hours_per_week?: number;
  cost_per_hour?: number;
  availability_status: 'available' | 'partially_allocated' | 'fully_allocated' | 'unavailable';
  total_allocation_percentage: number;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ResourceAllocation {
  id: string;
  resource_id: string;
  initiative_id: string;
  allocation_percentage: number;
  hours_per_week?: number;
  start_date: string;
  end_date?: string;
  role?: string;
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Dependency {
  id: string;
  source_type: 'ogsm_component' | 'initiative' | 'kpi' | 'risk';
  source_id: string;
  target_type: 'ogsm_component' | 'initiative' | 'kpi' | 'risk';
  target_id: string;
  dependency_type: 'depends_on' | 'blocks' | 'related_to' | 'supports' | 'conflicts_with';
  description?: string;
  strength?: 'weak' | 'medium' | 'strong' | 'critical';
  status: 'active' | 'resolved' | 'broken';
  created_at: string;
  updated_at: string;
}

export interface OGSMTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  structure: OGSMTemplateComponent[];
  is_public: boolean;
  usage_count: number;
  created_by?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OGSMTemplateComponent {
  component_type: 'objective' | 'goal' | 'strategy' | 'measure';
  title: string;
  description?: string;
  children?: OGSMTemplateComponent[];
}

export interface OGSMComponentVersion {
  id: string;
  component_id: string;
  version_number: number;
  title: string;
  description?: string;
  parent_id?: string;
  order_index: number;
  changed_by?: string;
  change_description?: string;
  created_at: string;
}

// AI Strategy Generation Types

export interface StrategyGenerationContext {
  objective: string;
  industry?: string;
  company_size?: string;
  current_situation?: string;
  constraints?: string;
  resources?: string;
  timeframe?: string;
}

export interface GeneratedStrategy {
  title: string;
  description: string;
  rationale: string;
  implementation_steps: string[];
  success_probability: number;
  estimated_cost: 'low' | 'medium' | 'high';
  timeframe: string;
  risks: string[];
  required_resources: string[];
  success_metrics: string[];
  supporting_evidence: string[];
}

export interface StrategyGenerationResponse {
  strategies: GeneratedStrategy[];
  generated_at: string;
  model: string;
}

export interface StrategyKnowledge {
  id: string;
  title: string;
  description: string;
  strategy_text: string;
  industry?: string;
  company_size?: string;
  objective_type?: string;
  success_metrics?: Record<string, any>;
  outcomes?: Record<string, any>;
  implementation_cost?: string;
  timeframe?: string;
  difficulty_level?: string;
  success_rate?: number;
  case_study_source?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface StrategyFeedback {
  generated_strategy_id: string;
  rating: number;
  feedback_type: 'implementation' | 'outcome' | 'general';
  comments?: string;
  outcome_achieved?: boolean;
  outcome_data?: Record<string, any>;
}

// User Preferences - stored in users.preferences JSONB column
export interface UserPreferences {
  // UI Preferences
  kpi_dashboard_view?: 'boxes' | 'list' | 'compact';
  theme?: 'light' | 'dark' | 'system';
  sidebar_collapsed?: boolean;
  items_per_page?: number;

  // Feature Preferences
  default_kpi_category?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;

  // Dashboard Customization
  dashboard_widgets?: string[];
  dashboard_layout?: 'standard' | 'compact' | 'detailed';

  // Extensible for future preferences
  [key: string]: any;
}

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  kpi_dashboard_view: 'boxes',
  theme: 'light',
  sidebar_collapsed: false,
  items_per_page: 20,
  notifications_enabled: true,
  email_notifications: true,
  dashboard_layout: 'standard',
};
