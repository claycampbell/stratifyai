export interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  upload_date: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface KPICategory {
  id: string;
  name: string;
  description?: string;
  color?: string;  // Hex color for UI theming (e.g., '#3B82F6')
  icon?: string;  // Icon name (e.g., 'TrendingUp', 'DollarSign')
  order_index: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface KPIHistory {
  id: string;
  kpi_id: string;
  value: number;
  recorded_date: Date;
  notes?: string;
  created_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  message: string;
  context?: Record<string, any>;
  created_at: Date;
}

export interface StrategicReport {
  id: string;
  report_type: '30_day' | '60_day' | '90_day' | 'weekly' | 'custom';
  title: string;
  content: string;
  generated_by: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface AIAnalysisRequest {
  type: 'alignment' | 'progress' | 'recommendation' | 'general';
  context?: Record<string, any>;
  query?: string;
}

export interface AIAnalysisResponse {
  analysis: string;
  recommendations?: string[];
  insights?: Record<string, any>;
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
  review_date?: Date;
  residual_likelihood?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  residual_impact?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Initiative {
  id: string;
  ogsm_component_id?: string;
  title: string;
  description?: string;
  objective?: string;
  status: 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: Date;
  target_end_date?: Date;
  actual_end_date?: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface InitiativeMilestone {
  id: string;
  initiative_id: string;
  title: string;
  description?: string;
  target_date: Date;
  completed: boolean;
  completed_date?: Date;
  deliverables?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InitiativeKPI {
  id: string;
  initiative_id: string;
  kpi_id: string;
  target_impact_description?: string;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface ScenarioKPIProjection {
  id: string;
  scenario_id: string;
  kpi_id: string;
  projected_value: number;
  projection_date: Date;
  confidence_level?: 'low' | 'medium' | 'high';
  assumptions?: string;
  notes?: string;
  created_at: Date;
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
  approved_at?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetTransaction {
  id: string;
  budget_id: string;
  transaction_type: 'allocation' | 'expenditure' | 'commitment' | 'adjustment' | 'refund';
  amount: number;
  transaction_date: Date;
  description?: string;
  category?: string;
  reference_number?: string;
  approved_by?: string;
  metadata?: Record<string, any>;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface ResourceAllocation {
  id: string;
  resource_id: string;
  initiative_id: string;
  allocation_percentage: number;
  hours_per_week?: number;
  start_date: Date;
  end_date?: Date;
  role?: string;
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
}

// 30/60/90 Day Plans Types

export interface StaffPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  title: string;
  description?: string;
  timeframe: '30_days' | '60_days' | '90_days';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  completion_percentage: number;
  target_completion_date?: Date;
  actual_completion_date?: Date;
  notes?: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface PlanItemLink {
  id: string;
  plan_item_id: string;
  link_type: 'strategy' | 'kpi' | 'initiative' | 'ogsm_component';
  link_id: string;
  description?: string;
  created_at: Date;
}

export interface PlanUpdate {
  id: string;
  plan_item_id: string;
  update_type: 'status_change' | 'progress_update' | 'note_added' | 'completion' | 'blocked';
  previous_value?: string;
  new_value?: string;
  notes?: string;
  updated_by?: string;
  created_at: Date;
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
  dashboard_widgets?: string[];  // Widget IDs to display
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

// P0-006: RMU Athletics Philosophy & Non-Negotiables Integration

export interface PhilosophyDocument {
  id: string;
  type: 'mission' | 'vision' | 'purpose' | 'value' | 'guiding_principle' | 'operating_principle' | 'theme';
  category?: string;
  title: string;
  content: string;
  priority_weight: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NonNegotiable {
  id: string;
  rule_number: number;
  title: string;
  description: string;
  enforcement_type: 'hard_constraint' | 'priority_rule' | 'operational_expectation';
  auto_reject: boolean;
  validation_keywords?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DecisionHierarchyLevel {
  id: string;
  level: number;
  stakeholder: string;
  description?: string;
  weight: number;
  created_at: Date;
}

export interface ValidationResult {
  status: 'approved' | 'flagged' | 'rejected';
  violations: NonNegotiable[];
  autoReject: boolean;
}

export interface AIRecommendationValidation {
  id: string;
  chat_history_id: string;
  recommendation_text: string;
  validation_status: 'approved' | 'flagged' | 'rejected';
  cited_values?: string[];
  cited_non_negotiables?: string[];
  violated_constraints?: string[];
  decision_hierarchy_alignment?: Record<string, number>;
  conflict_resolution?: string;
  transparency_score?: number;
  created_at: Date;
}

export interface RecommendationWithAlignment {
  recommendation: string;
  alignment: {
    mission_vision: string;
    core_values: string[];
    decision_hierarchy: {
      university: number;
      department: number;
      individual: number;
    };
    cited_principles: string[];
    non_negotiables_check: string;
  };
  potential_conflicts: string;
  implementation_notes: string;
}

// Fiscal Year Planning Types

export interface FiscalYearPlan {
  id: string;
  fiscal_year: string;  // 'FY27', 'FY28'
  status: 'draft' | 'active' | 'completed' | 'archived';
  start_date?: Date;
  end_date?: Date;
  created_by?: string;
  created_at: Date;
  activated_at?: Date;
  completed_at?: Date;
}

export interface FiscalYearPriority {
  id: string;
  fiscal_plan_id: string;
  priority_number: 1 | 2 | 3;
  title: string;
  description?: string;
  imported_from_ogsm_id?: string;
  created_at: Date;
}

export interface FiscalYearDraftStrategy {
  id: string;
  fiscal_plan_id: string;
  priority_id: string;

  // Strategy details from AI generation
  title: string;
  description?: string;
  rationale?: string;
  implementation_steps?: string[];
  success_probability?: number;
  estimated_cost?: string;
  timeframe?: string;
  risks?: string[];
  required_resources?: string[];
  success_metrics?: string[];
  supporting_evidence?: string[];

  // Workflow status
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | 'converted';
  converted_to_ogsm_id?: string;

  // Metadata
  generated_from_ai: boolean;
  ai_generation_id?: string;
  created_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  review_notes?: string;
}

// Request/Response types for fiscal planning API

export interface CreateFiscalPlanRequest {
  fiscal_year: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdatePrioritiesRequest {
  priorities: {
    priority_number: 1 | 2 | 3;
    title: string;
    description?: string;
  }[];
}

export interface ImportPriorityRequest {
  ogsm_component_id: string;
  priority_number: 1 | 2 | 3;
}

export interface AddStrategyRequest {
  priority_id: string;
  strategy: {
    title: string;
    description?: string;
    rationale?: string;
    implementation_steps?: string[];
    success_probability?: number;
    estimated_cost?: string;
    timeframe?: string;
    risks?: string[];
    required_resources?: string[];
    success_metrics?: string[];
    supporting_evidence?: string[];
  };
  ai_generation_id?: string;
}

export interface BulkAddStrategiesRequest {
  strategies: AddStrategyRequest[];
}

export interface UpdateStrategyStatusRequest {
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  review_notes?: string;
}

export interface ConvertToOGSMRequest {
  strategy_ids: string[];
}

export interface ConvertToOGSMResponse {
  created_objectives: OGSMComponent[];
  created_strategies: OGSMComponent[];
  created_kpis: KPI[];
}

export interface FiscalPlanSummary {
  plan: FiscalYearPlan;
  priorities: (FiscalYearPriority & {
    strategy_count: number;
  })[];
  draft_strategies_count: {
    draft: number;
    under_review: number;
    approved: number;
    rejected: number;
    converted: number;
  };
  converted_count: number;
  kpis_created_count: number;
}

// Extended types for full plan view with relationships

export interface FiscalYearPlanWithRelations extends FiscalYearPlan {
  priorities: (FiscalYearPriority & {
    strategies: FiscalYearDraftStrategy[];
  })[];
}
