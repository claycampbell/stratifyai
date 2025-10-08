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
