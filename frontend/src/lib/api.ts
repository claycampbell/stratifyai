import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Documents API
export const documentsApi = {
  getAll: () => api.get('/documents'),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// OGSM API
export const ogsmApi = {
  getAll: (params?: { type?: string; document_id?: string }) => api.get('/ogsm', { params }),
  getById: (id: string) => api.get(`/ogsm/${id}`),
  create: (data: any) => api.post('/ogsm', data),
  update: (id: string, data: any) => api.put(`/ogsm/${id}`, data),
  delete: (id: string) => api.delete(`/ogsm/${id}`),
  getHierarchy: () => api.get('/ogsm/hierarchy/tree'),
  duplicate: (id: string, includeChildren?: boolean) =>
    api.post(`/ogsm/${id}/duplicate`, { include_children: includeChildren }),
  bulkReorder: (updates: Array<{ id: string; order_index?: number; parent_id?: string | null }>) =>
    api.post('/ogsm/bulk/reorder', { updates }),
};

// OGSM Templates API
export const ogsmTemplatesApi = {
  getAll: (params?: { category?: string; is_public?: boolean }) => api.get('/ogsm-templates', { params }),
  getById: (id: string) => api.get(`/ogsm-templates/${id}`),
  create: (data: any) => api.post('/ogsm-templates', data),
  update: (id: string, data: any) => api.put(`/ogsm-templates/${id}`, data),
  delete: (id: string) => api.delete(`/ogsm-templates/${id}`),
  apply: (id: string, documentId?: string) => api.post(`/ogsm-templates/${id}/apply`, { document_id: documentId }),
};

// KPIs API
export const kpisApi = {
  getAll: (params?: { status?: string; frequency?: string }) => api.get('/kpis', { params }),
  getById: (id: string) => api.get(`/kpis/${id}`),
  create: (data: any) => api.post('/kpis', data),
  update: (id: string, data: any) => api.put(`/kpis/${id}`, data),
  delete: (id: string) => api.delete(`/kpis/${id}`),
  addHistory: (id: string, data: any) => api.post(`/kpis/${id}/history`, data),
  getHistory: (id: string) => api.get(`/kpis/${id}/history`),
  updateHistory: (kpiId: string, historyId: string, data: { value?: number; recorded_date?: string; notes?: string }) =>
    api.put(`/kpis/${kpiId}/history/${historyId}`, data),
  deleteHistory: (kpiId: string, historyId: string) => api.delete(`/kpis/${kpiId}/history/${historyId}`),
  getStats: (id: string) => api.get(`/kpis/${id}/stats`),
  getForecast: (id: string, periods?: number) => api.get(`/kpis/${id}/forecast`, { params: { periods } }),
  getActions: (id: string) => api.get(`/kpis/${id}/actions`),
  importFromCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/kpis/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// KPI Categories API
export const kpiCategoriesApi = {
  getAll: () => api.get('/kpi-categories'),
  getById: (id: string) => api.get(`/kpi-categories/${id}`),
  create: (data: { name: string; description?: string; color?: string; icon?: string; order_index?: number }) =>
    api.post('/kpi-categories', data),
  update: (id: string, data: { name?: string; description?: string; color?: string; icon?: string; order_index?: number }) =>
    api.put(`/kpi-categories/${id}`, data),
  delete: (id: string) => api.delete(`/kpi-categories/${id}`),
  getKPIs: (id: string) => api.get(`/kpi-categories/${id}/kpis`),
};

// AI API
export const aiApi = {
  chat: (message: string, sessionId?: string, context?: any) =>
    api.post('/ai/chat', { message, session_id: sessionId, context }),
  getChatHistory: (sessionId: string) => api.get(`/ai/chat/${sessionId}`),
  getChatSessions: () => api.get('/ai/chat-sessions'),
  deleteSession: (sessionId: string) => api.delete(`/ai/chat/${sessionId}`),
  searchChatHistory: (query?: string, startDate?: string, endDate?: string) =>
    api.get('/ai/chat-search', { params: { query, start_date: startDate, end_date: endDate } }),
  analyze: (type: string) => api.post('/ai/analyze', { type }),
  generateReport: (reportType: string, title: string, timeframe?: string) =>
    api.post('/ai/reports/generate', { report_type: reportType, title, timeframe }),
  getReports: (reportType?: string) => api.get('/ai/reports', { params: { report_type: reportType } }),
  getReportById: (id: string) => api.get(`/ai/reports/${id}`),
  deleteReport: (id: string) => api.delete(`/ai/reports/${id}`),
  getRecommendations: () => api.post('/ai/recommendations'),
};

// AI Strategy API
export const aiStrategyApi = {
  generate: (context: {
    objective: string;
    industry?: string;
    company_size?: string;
    current_situation?: string;
    constraints?: string;
    resources?: string;
    timeframe?: string;
    num_strategies?: number;
  }) => api.post('/ai-strategy/generate', context),
  addToKnowledgeBase: (data: {
    title: string;
    description: string;
    strategy_text: string;
    industry?: string;
    company_size?: string;
    objective_type?: string;
    success_metrics?: any;
    outcomes?: any;
    implementation_cost?: string;
    timeframe?: string;
    difficulty_level?: string;
    success_rate?: number;
    case_study_source?: string;
    tags?: string[];
  }) => api.post('/ai-strategy/knowledge-base', data),
  submitFeedback: (data: {
    generated_strategy_id: string;
    rating: number;
    feedback_type: 'implementation' | 'outcome' | 'general';
    comments?: string;
    outcome_achieved?: boolean;
    outcome_data?: any;
  }) => api.post('/ai-strategy/feedback', data),
};

// Dashboard API
export const dashboardApi = {
  getAnalytics: () => api.get('/dashboard/analytics'),
  getRoadmap: () => api.get('/dashboard/roadmap'),
  getAlignment: () => api.get('/dashboard/alignment'),
};

// KPI Enhancements API
export const kpiEnhancementsApi = {
  // Templates
  getTemplates: (category?: string) => api.get('/kpi-enhancements/templates', { params: { category } }),
  createFromTemplate: (templateId: string, data: any) =>
    api.post(`/kpi-enhancements/templates/${templateId}/create`, data),
  createTemplate: (data: any) => api.post('/kpi-enhancements/templates', data),

  // Bulk Operations
  bulkUpdate: (kpiIds: string[], updates: any, performedBy?: string) =>
    api.post('/kpi-enhancements/bulk/update', { kpi_ids: kpiIds, updates, performed_by: performedBy }),
  bulkDelete: (kpiIds: string[], performedBy?: string) =>
    api.post('/kpi-enhancements/bulk/delete', { kpi_ids: kpiIds, performed_by: performedBy }),
  getBulkHistory: (limit?: number) => api.get('/kpi-enhancements/bulk/history', { params: { limit } }),

  // Recalculation
  recalculateStatus: (id: string) => api.post(`/kpi-enhancements/${id}/recalculate`),

  // Alerts
  getAlerts: (params?: { kpi_id?: string; acknowledged?: boolean; severity?: string; limit?: number }) =>
    api.get('/kpi-enhancements/alerts', { params }),
  getKPIAlerts: (kpiId: string, limit?: number) =>
    api.get(`/kpi-enhancements/${kpiId}/alerts`, { params: { limit } }),
  acknowledgeAlert: (alertId: string, acknowledgedBy?: string) =>
    api.post(`/kpi-enhancements/alerts/${alertId}/acknowledge`, { acknowledged_by: acknowledgedBy }),

  // Validation
  validateValue: (value: number, validationRules?: any) =>
    api.post('/kpi-enhancements/validate', { value, validation_rules: validationRules }),
};

// Strategic Planning APIs

// Risks API
export const risksApi = {
  getAll: (params?: { status?: string; category?: string; owner_email?: string; min_score?: number; sort_by?: string; sort_order?: string }) =>
    api.get('/risks', { params }),
  getById: (id: string) => api.get(`/risks/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/risks/ogsm/${ogsmId}`),
  create: (data: any) => api.post('/risks', data),
  update: (id: string, data: any) => api.put(`/risks/${id}`, data),
  delete: (id: string) => api.delete(`/risks/${id}`),
  getStats: () => api.get('/risks/stats/summary'),
  getMatrixData: () => api.get('/risks/matrix/data'),
};

// Initiatives API
export const initiativesApi = {
  getAll: (params?: { status?: string; priority?: string; owner_email?: string; sort_by?: string; sort_order?: string }) =>
    api.get('/initiatives', { params }),
  getById: (id: string) => api.get(`/initiatives/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/initiatives/ogsm/${ogsmId}`),
  create: (data: any) => api.post('/initiatives', data),
  update: (id: string, data: any) => api.put(`/initiatives/${id}`, data),
  delete: (id: string) => api.delete(`/initiatives/${id}`),
  getStats: () => api.get('/initiatives/stats/summary'),
  // Milestones
  getMilestones: (initiativeId: string) => api.get(`/initiatives/${initiativeId}/milestones`),
  createMilestone: (initiativeId: string, data: any) => api.post(`/initiatives/${initiativeId}/milestones`, data),
  updateMilestone: (initiativeId: string, milestoneId: string, data: any) =>
    api.put(`/initiatives/${initiativeId}/milestones/${milestoneId}`, data),
  deleteMilestone: (initiativeId: string, milestoneId: string) =>
    api.delete(`/initiatives/${initiativeId}/milestones/${milestoneId}`),
  // KPI Links
  getLinkedKPIs: (initiativeId: string) => api.get(`/initiatives/${initiativeId}/kpis`),
  linkKPI: (initiativeId: string, kpiId: string, targetImpact?: string) =>
    api.post(`/initiatives/${initiativeId}/kpis`, { kpi_id: kpiId, target_impact_description: targetImpact }),
  unlinkKPI: (initiativeId: string, kpiId: string) => api.delete(`/initiatives/${initiativeId}/kpis/${kpiId}`),
};

// Scenarios API
export const scenariosApi = {
  getAll: (params?: { status?: string; scenario_type?: string; sort_by?: string; sort_order?: string }) =>
    api.get('/scenarios', { params }),
  getById: (id: string) => api.get(`/scenarios/${id}`),
  getBaseline: () => api.get('/scenarios/baseline/current'),
  create: (data: any) => api.post('/scenarios', data),
  update: (id: string, data: any) => api.put(`/scenarios/${id}`, data),
  delete: (id: string) => api.delete(`/scenarios/${id}`),
  // Projections
  getProjections: (scenarioId: string) => api.get(`/scenarios/${scenarioId}/projections`),
  createProjection: (scenarioId: string, data: any) => api.post(`/scenarios/${scenarioId}/projections`, data),
  deleteProjection: (scenarioId: string, projectionId: string) =>
    api.delete(`/scenarios/${scenarioId}/projections/${projectionId}`),
  // Analysis
  compareScenarios: (scenarioIds: string[], kpiIds?: string[]) =>
    api.post('/scenarios/compare', { scenario_ids: scenarioIds, kpi_ids: kpiIds }),
  runWhatIf: (kpiId: string, valueChanges: any[]) =>
    api.post('/scenarios/what-if', { kpi_id: kpiId, value_changes: valueChanges }),
};

// Budgets API
export const budgetsApi = {
  getAll: (params?: { status?: string; budget_type?: string; fiscal_year?: number; fiscal_quarter?: number; owner_email?: string; sort_by?: string; sort_order?: string }) =>
    api.get('/budgets', { params }),
  getById: (id: string) => api.get(`/budgets/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/budgets/ogsm/${ogsmId}`),
  getByInitiative: (initiativeId: string) => api.get(`/budgets/initiative/${initiativeId}`),
  create: (data: any) => api.post('/budgets', data),
  update: (id: string, data: any) => api.put(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
  getStats: (fiscalYear?: number, fiscalQuarter?: number) =>
    api.get('/budgets/stats/summary', { params: { fiscal_year: fiscalYear, fiscal_quarter: fiscalQuarter } }),
  // Transactions
  getTransactions: (budgetId: string) => api.get(`/budgets/${budgetId}/transactions`),
  createTransaction: (budgetId: string, data: any) => api.post(`/budgets/${budgetId}/transactions`, data),
  deleteTransaction: (budgetId: string, transactionId: string) =>
    api.delete(`/budgets/${budgetId}/transactions/${transactionId}`),
};

// Resources API
export const resourcesApi = {
  getAll: (params?: { resource_type?: string; availability_status?: string; department?: string; sort_by?: string; sort_order?: string }) =>
    api.get('/resources', { params }),
  getById: (id: string) => api.get(`/resources/${id}`),
  getAvailable: (resourceType?: string, minAvailability?: number) =>
    api.get('/resources/available/list', { params: { resource_type: resourceType, min_availability_percentage: minAvailability } }),
  create: (data: any) => api.post('/resources', data),
  update: (id: string, data: any) => api.put(`/resources/${id}`, data),
  delete: (id: string) => api.delete(`/resources/${id}`),
  getStats: () => api.get('/resources/stats/summary'),
  // Allocations
  getAllAllocations: (status?: string, initiativeId?: string) =>
    api.get('/resources/allocations/all', { params: { status, initiative_id: initiativeId } }),
  getAllocations: (resourceId: string) => api.get(`/resources/${resourceId}/allocations`),
  createAllocation: (resourceId: string, data: any) => api.post(`/resources/${resourceId}/allocations`, data),
  updateAllocation: (resourceId: string, allocationId: string, data: any) =>
    api.put(`/resources/${resourceId}/allocations/${allocationId}`, data),
  deleteAllocation: (resourceId: string, allocationId: string) =>
    api.delete(`/resources/${resourceId}/allocations/${allocationId}`),
};

// Dependencies API
export const dependenciesApi = {
  getAll: (params?: { dependency_type?: string; status?: string; strength?: string; source_type?: string; target_type?: string }) =>
    api.get('/dependencies', { params }),
  getById: (id: string) => api.get(`/dependencies/${id}`),
  getForEntity: (entityType: string, entityId: string, direction?: 'outgoing' | 'incoming' | 'both') =>
    api.get(`/dependencies/entity/${entityType}/${entityId}`, { params: { direction } }),
  create: (data: any) => api.post('/dependencies', data),
  update: (id: string, data: any) => api.put(`/dependencies/${id}`, data),
  delete: (id: string) => api.delete(`/dependencies/${id}`),
  getStats: () => api.get('/dependencies/stats/summary'),
  getGraphData: (entityTypes?: string[], status?: string) =>
    api.get('/dependencies/graph/data', { params: { entity_types: entityTypes, status } }),
  analyzeImpact: (entityType: string, entityId: string, maxDepth?: number) =>
    api.post('/dependencies/analyze/impact', { entity_type: entityType, entity_id: entityId, max_depth: maxDepth }),
  findCircular: () => api.post('/dependencies/analyze/circular'),
};

// Staff Plans API
export const staffPlansApi = {
  getAll: (params?: { user_id?: string; status?: string }) => api.get('/staff-plans', { params }),
  getById: (id: string) => api.get(`/staff-plans/${id}`),
  create: (data: {
    user_id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    status?: string;
    created_by?: string;
  }) => api.post('/staff-plans', data),
  update: (id: string, data: any) => api.put(`/staff-plans/${id}`, data),
  delete: (id: string) => api.delete(`/staff-plans/${id}`),
  getItems: (id: string, params?: { timeframe?: string; status?: string }) =>
    api.get(`/staff-plans/${id}/items`, { params }),
  getStats: (id: string) => api.get(`/staff-plans/${id}/stats`),
};

// Plan Items API
export const planItemsApi = {
  getAll: (params?: { plan_id?: string; timeframe?: string; status?: string; priority?: string }) =>
    api.get('/plan-items', { params }),
  getById: (id: string) => api.get(`/plan-items/${id}`),
  create: (data: {
    plan_id: string;
    title: string;
    description?: string;
    timeframe: string;
    priority?: string;
    status?: string;
    completion_percentage?: number;
    target_completion_date?: string;
    notes?: string;
    order_index?: number;
  }) => api.post('/plan-items', data),
  update: (id: string, data: any) => api.put(`/plan-items/${id}`, data),
  delete: (id: string) => api.delete(`/plan-items/${id}`),
  getLinks: (id: string) => api.get(`/plan-items/${id}/links`),
  getUpdates: (id: string) => api.get(`/plan-items/${id}/updates`),
  addUpdate: (id: string, data: {
    update_type: string;
    previous_value?: string;
    new_value?: string;
    notes?: string;
    updated_by?: string;
  }) => api.post(`/plan-items/${id}/updates`, data),
  reorder: (items: Array<{ id: string; order_index: number }>) =>
    api.patch('/plan-items/reorder', { items }),
};

// Plan Links API
export const planLinksApi = {
  getAll: (params?: { plan_item_id?: string; link_type?: string; link_id?: string }) =>
    api.get('/plan-links', { params }),
  getById: (id: string) => api.get(`/plan-links/${id}`),
  create: (data: {
    plan_item_id: string;
    link_type: string;
    link_id: string;
    description?: string;
  }) => api.post('/plan-links', data),
  update: (id: string, data: { description?: string }) => api.put(`/plan-links/${id}`, data),
  delete: (id: string) => api.delete(`/plan-links/${id}`),
  getDetails: (id: string) => api.get(`/plan-links/${id}/details`),
  bulkCreate: (plan_item_id: string, links: Array<{
    link_type: string;
    link_id: string;
    description?: string;
  }>) => api.post('/plan-links/bulk', { plan_item_id, links }),
};

// User Preferences API
export const preferencesApi = {
  get: () => api.get('/users/preferences'),
  update: (preferences: any) => api.put('/users/preferences', preferences),
  updateKey: (key: string, value: any) => api.patch(`/users/preferences/${key}`, { value }),
  reset: () => api.post('/users/preferences/reset'),
};

// Philosophy API
export const philosophyApi = {
  getDocuments: () => api.get('/philosophy/documents'),
  createDocument: (data: {
    type: string;
    category?: string;
    title: string;
    content: string;
    priority_weight?: number;
  }) => api.post('/philosophy/documents', data),
  getNonNegotiables: () => api.get('/philosophy/non-negotiables'),
  getDecisionHierarchy: () => api.get('/philosophy/decision-hierarchy'),
  validate: (data: {
    recommendationText: string;
    chatHistoryId?: string;
  }) => api.post('/philosophy/validate', data),
  getRecentValidations: (limit?: number) =>
    api.get('/philosophy/validations/recent', { params: { limit } }),
};

// Fiscal Year Planning API
export const fiscalPlanningApi = {
  // Plans
  createPlan: (data: { fiscal_year: string; start_date?: string; end_date?: string }) =>
    api.post('/fiscal-planning/plans', data),
  getActivePlan: () => api.get('/fiscal-planning/plans/active'),
  getPlanById: (planId: string) => api.get(`/fiscal-planning/plans/${planId}`),
  getPlanSummary: (planId: string) => api.get(`/fiscal-planning/plans/${planId}/summary`),
  activatePlan: (planId: string) => api.post(`/fiscal-planning/plans/${planId}/activate`),

  // Priorities
  updatePriorities: (planId: string, data: {
    priorities: Array<{
      priority_number: 1 | 2 | 3;
      title: string;
      description?: string;
    }>
  }) => api.post(`/fiscal-planning/plans/${planId}/priorities`, data),
  importPriority: (planId: string, data: {
    ogsm_component_id: string;
    priority_number: 1 | 2 | 3;
  }) => api.post(`/fiscal-planning/plans/${planId}/priorities/import`, data),

  // Strategies
  addStrategy: (planId: string, data: {
    priority_id: string;
    strategy: any;
    ai_generation_id?: string;
  }) => api.post(`/fiscal-planning/plans/${planId}/strategies`, data),
  bulkAddStrategies: (planId: string, data: {
    strategies: Array<{
      priority_id: string;
      strategy: any;
      ai_generation_id?: string;
    }>
  }) => api.post(`/fiscal-planning/plans/${planId}/strategies/bulk`, data),
  updateStrategyStatus: (strategyId: string, data: {
    status: 'draft' | 'under_review' | 'approved' | 'rejected';
    review_notes?: string;
  }) => api.patch(`/fiscal-planning/strategies/${strategyId}`, data),

  // Conversion
  convertToOGSM: (planId: string, data: { strategy_ids: string[] }) =>
    api.post(`/fiscal-planning/plans/${planId}/convert-to-ogsm`, data),
};

export default api;
