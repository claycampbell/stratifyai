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
