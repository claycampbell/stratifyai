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

export interface KPI {
  id: string;
  ogsm_component_id?: string;
  name: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  status: 'on_track' | 'at_risk' | 'off_track';
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
