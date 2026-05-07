import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Documents API
export interface DocumentUploadOptions {
  extract_ogsm?: boolean;
  extract_kpis?: boolean;
  feed_strategic_planning?: boolean;
  store_only?: boolean;
}

export const documentsApi = {
  getAll: () => api.get('/documents'),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (file: File, options?: DocumentUploadOptions) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      if (options.extract_ogsm !== undefined) {
        formData.append('extract_ogsm', String(options.extract_ogsm));
      }
      if (options.extract_kpis !== undefined) {
        formData.append('extract_kpis', String(options.extract_kpis));
      }
      if (options.feed_strategic_planning !== undefined) {
        formData.append('feed_strategic_planning', String(options.feed_strategic_planning));
      }
      if (options.store_only !== undefined) {
        formData.append('store_only', String(options.store_only));
      }
    }
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  getByFiscalPlan: (planId: string) => api.get(`/kpis/by-fiscal-plan/${planId}`),
  copyToFiscalPlan: (sourcePlanId: string, targetPlanId: string, kpiIds: string[]) =>
    api.post('/kpis/copy-to-fiscal-plan', {
      source_plan_id: sourcePlanId,
      target_plan_id: targetPlanId,
      kpi_ids: kpiIds,
    }),
  importFromCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/kpis/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  // R-1 / R-2: pre-canned report templates with constrained data scope.
  getReportTemplates: () => api.get('/ai/reports/templates'),
  generateFromTemplate: (templateId: string, params: Record<string, any>) =>
    api.post('/ai/reports/from-template', { template_id: templateId, params }),
  getReports: (reportType?: string) => api.get('/ai/reports', { params: { report_type: reportType } }),
  getReportById: (id: string) => api.get(`/ai/reports/${id}`),
  deleteReport: (id: string) => api.delete(`/ai/reports/${id}`),
  getRecommendations: () => api.post('/ai/recommendations'),
};

// AI Strategy API
export const aiStrategyApi = {
  generate: (context: any) => api.post('/ai-strategy/generate', context),
  addToKnowledgeBase: (data: any) => api.post('/ai-strategy/knowledge-base', data),
  submitFeedback: (data: any) => api.post('/ai-strategy/feedback', data),
};

// Dashboard API
export const dashboardApi = {
  getAnalytics: () => api.get('/dashboard/analytics'),
  getRoadmap: () => api.get('/dashboard/roadmap'),
  getAlignment: () => api.get('/dashboard/alignment'),
};

// KPI Enhancements API
export const kpiEnhancementsApi = {
  getTemplates: (category?: string) => api.get('/kpi-enhancements/templates', { params: { category } }),
  createFromTemplate: (templateId: string, data: any) =>
    api.post(`/kpi-enhancements/templates/${templateId}/create`, data),
  createTemplate: (data: any) => api.post('/kpi-enhancements/templates', data),
  bulkUpdate: (kpiIds: string[], updates: any, performedBy?: string) =>
    api.post('/kpi-enhancements/bulk/update', { kpi_ids: kpiIds, updates, performed_by: performedBy }),
  bulkDelete: (kpiIds: string[], performedBy?: string) =>
    api.post('/kpi-enhancements/bulk/delete', { kpi_ids: kpiIds, performed_by: performedBy }),
  getBulkHistory: (limit?: number) => api.get('/kpi-enhancements/bulk/history', { params: { limit } }),
  recalculateStatus: (id: string) => api.post(`/kpi-enhancements/${id}/recalculate`),
  getAlerts: (params?: { kpi_id?: string; acknowledged?: boolean; severity?: string; limit?: number }) =>
    api.get('/kpi-enhancements/alerts', { params }),
  getKPIAlerts: (kpiId: string, limit?: number) =>
    api.get(`/kpi-enhancements/${kpiId}/alerts`, { params: { limit } }),
  acknowledgeAlert: (alertId: string, acknowledgedBy?: string) =>
    api.post(`/kpi-enhancements/alerts/${alertId}/acknowledge`, { acknowledged_by: acknowledgedBy }),
  validateValue: (value: number, validationRules?: any) =>
    api.post('/kpi-enhancements/validate', { value, validation_rules: validationRules }),
};

// Strategic Planning APIs
export const risksApi = {
  getAll: (params?: any) => api.get('/risks', { params }),
  getById: (id: string) => api.get(`/risks/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/risks/ogsm/${ogsmId}`),
  create: (data: any) => api.post('/risks', data),
  update: (id: string, data: any) => api.put(`/risks/${id}`, data),
  delete: (id: string) => api.delete(`/risks/${id}`),
  getStats: () => api.get('/risks/stats/summary'),
  getMatrixData: () => api.get('/risks/matrix/data'),
};

export const initiativesApi = {
  getAll: (params?: any) => api.get('/initiatives', { params }),
  getById: (id: string) => api.get(`/initiatives/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/initiatives/ogsm/${ogsmId}`),
  create: (data: any) => api.post('/initiatives', data),
  update: (id: string, data: any) => api.put(`/initiatives/${id}`, data),
  delete: (id: string) => api.delete(`/initiatives/${id}`),
  getStats: () => api.get('/initiatives/stats/summary'),
  getMilestones: (initiativeId: string) => api.get(`/initiatives/${initiativeId}/milestones`),
  createMilestone: (initiativeId: string, data: any) => api.post(`/initiatives/${initiativeId}/milestones`, data),
  updateMilestone: (initiativeId: string, milestoneId: string, data: any) =>
    api.put(`/initiatives/${initiativeId}/milestones/${milestoneId}`, data),
  deleteMilestone: (initiativeId: string, milestoneId: string) =>
    api.delete(`/initiatives/${initiativeId}/milestones/${milestoneId}`),
  getLinkedKPIs: (initiativeId: string) => api.get(`/initiatives/${initiativeId}/kpis`),
  linkKPI: (initiativeId: string, kpiId: string, targetImpact?: string) =>
    api.post(`/initiatives/${initiativeId}/kpis`, { kpi_id: kpiId, target_impact_description: targetImpact }),
  unlinkKPI: (initiativeId: string, kpiId: string) => api.delete(`/initiatives/${initiativeId}/kpis/${kpiId}`),
};

export const scenariosApi = {
  getAll: (params?: any) => api.get('/scenarios', { params }),
  getById: (id: string) => api.get(`/scenarios/${id}`),
  getBaseline: () => api.get('/scenarios/baseline/current'),
  create: (data: any) => api.post('/scenarios', data),
  update: (id: string, data: any) => api.put(`/scenarios/${id}`, data),
  delete: (id: string) => api.delete(`/scenarios/${id}`),
  getProjections: (scenarioId: string) => api.get(`/scenarios/${scenarioId}/projections`),
  createProjection: (scenarioId: string, data: any) => api.post(`/scenarios/${scenarioId}/projections`, data),
  deleteProjection: (scenarioId: string, projectionId: string) =>
    api.delete(`/scenarios/${scenarioId}/projections/${projectionId}`),
  compareScenarios: (scenarioIds: string[], kpiIds?: string[]) =>
    api.post('/scenarios/compare', { scenario_ids: scenarioIds, kpi_ids: kpiIds }),
  runWhatIf: (kpiId: string, valueChanges: any[]) =>
    api.post('/scenarios/what-if', { kpi_id: kpiId, value_changes: valueChanges }),
};

export const budgetsApi = {
  getAll: (params?: any) => api.get('/budgets', { params }),
  getById: (id: string) => api.get(`/budgets/${id}`),
  getByOGSM: (ogsmId: string) => api.get(`/budgets/ogsm/${ogsmId}`),
  getByInitiative: (initiativeId: string) => api.get(`/budgets/initiative/${initiativeId}`),
  create: (data: any) => api.post('/budgets', data),
  update: (id: string, data: any) => api.put(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
  getStats: (fiscalYear?: number, fiscalQuarter?: number) =>
    api.get('/budgets/stats/summary', { params: { fiscal_year: fiscalYear, fiscal_quarter: fiscalQuarter } }),
  getTransactions: (budgetId: string) => api.get(`/budgets/${budgetId}/transactions`),
  createTransaction: (budgetId: string, data: any) => api.post(`/budgets/${budgetId}/transactions`, data),
  deleteTransaction: (budgetId: string, transactionId: string) =>
    api.delete(`/budgets/${budgetId}/transactions/${transactionId}`),
};

export const resourcesApi = {
  getAll: (params?: any) => api.get('/resources', { params }),
  getById: (id: string) => api.get(`/resources/${id}`),
  getAvailable: (resourceType?: string, minAvailability?: number) =>
    api.get('/resources/available/list', { params: { resource_type: resourceType, min_availability_percentage: minAvailability } }),
  create: (data: any) => api.post('/resources', data),
  update: (id: string, data: any) => api.put(`/resources/${id}`, data),
  delete: (id: string) => api.delete(`/resources/${id}`),
  getStats: () => api.get('/resources/stats/summary'),
  getAllAllocations: (status?: string, initiativeId?: string) =>
    api.get('/resources/allocations/all', { params: { status, initiative_id: initiativeId } }),
  getAllocations: (resourceId: string) => api.get(`/resources/${resourceId}/allocations`),
  createAllocation: (resourceId: string, data: any) => api.post(`/resources/${resourceId}/allocations`, data),
  updateAllocation: (resourceId: string, allocationId: string, data: any) =>
    api.put(`/resources/${resourceId}/allocations/${allocationId}`, data),
  deleteAllocation: (resourceId: string, allocationId: string) =>
    api.delete(`/resources/${resourceId}/allocations/${allocationId}`),
};

export const dependenciesApi = {
  getAll: (params?: any) => api.get('/dependencies', { params }),
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
  create: (data: any) => api.post('/staff-plans', data),
  update: (id: string, data: any) => api.put(`/staff-plans/${id}`, data),
  delete: (id: string) => api.delete(`/staff-plans/${id}`),
  getItems: (id: string, params?: { timeframe?: string; status?: string }) =>
    api.get(`/staff-plans/${id}/items`, { params }),
  getStats: (id: string) => api.get(`/staff-plans/${id}/stats`),
};

// Plan Items API
export const planItemsApi = {
  getAll: (params?: any) => api.get('/plan-items', { params }),
  getById: (id: string) => api.get(`/plan-items/${id}`),
  create: (data: any) => api.post('/plan-items', data),
  update: (id: string, data: any) => api.put(`/plan-items/${id}`, data),
  delete: (id: string) => api.delete(`/plan-items/${id}`),
  getLinks: (id: string) => api.get(`/plan-items/${id}/links`),
  getUpdates: (id: string) => api.get(`/plan-items/${id}/updates`),
  addUpdate: (id: string, data: any) => api.post(`/plan-items/${id}/updates`, data),
  reorder: (items: Array<{ id: string; order_index: number }>) =>
    api.patch('/plan-items/reorder', { items }),
};

// Plan Links API
export const planLinksApi = {
  getAll: (params?: { plan_item_id?: string; link_type?: string; link_id?: string }) =>
    api.get('/plan-links', { params }),
  getById: (id: string) => api.get(`/plan-links/${id}`),
  create: (data: any) => api.post('/plan-links', data),
  update: (id: string, data: any) => api.put(`/plan-links/${id}`, data),
  delete: (id: string) => api.delete(`/plan-links/${id}`),
  getDetails: (id: string) => api.get(`/plan-links/${id}/details`),
  bulkCreate: (plan_item_id: string, links: Array<any>) => api.post('/plan-links/bulk', { plan_item_id, links }),
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
  // Documents
  getDocuments: () => api.get('/philosophy/documents'),
  createDocument: (data: {
    type: string;
    category?: string | null;
    title: string;
    content: string;
    priority_weight?: number;
  }) => api.post('/philosophy/documents', data),
  updateDocument: (
    id: string,
    data: {
      type?: string;
      category?: string | null;
      title?: string;
      content?: string;
      priority_weight?: number;
      is_active?: boolean;
    }
  ) => api.put(`/philosophy/documents/${id}`, data),
  deleteDocument: (id: string) => api.delete(`/philosophy/documents/${id}`),

  // Non-negotiables
  getNonNegotiables: () => api.get('/philosophy/non-negotiables'),
  getNonNegotiable: (id: string) => api.get(`/philosophy/non-negotiables/${id}`),
  createNonNegotiable: (data: {
    rule_number: number;
    title: string;
    description: string;
    enforcement_type: 'hard_constraint' | 'priority_rule' | 'operational_expectation';
    auto_reject?: boolean;
    validation_keywords?: string[];
    is_active?: boolean;
  }) => api.post('/philosophy/non-negotiables', data),
  updateNonNegotiable: (
    id: string,
    data: {
      rule_number?: number;
      title?: string;
      description?: string;
      enforcement_type?: 'hard_constraint' | 'priority_rule' | 'operational_expectation';
      auto_reject?: boolean;
      validation_keywords?: string[];
      is_active?: boolean;
    }
  ) => api.put(`/philosophy/non-negotiables/${id}`, data),
  deleteNonNegotiable: (id: string) => api.delete(`/philosophy/non-negotiables/${id}`),

  // Decision hierarchy
  getDecisionHierarchy: () => api.get('/philosophy/decision-hierarchy'),
  getDecisionHierarchyLevel: (id: string) =>
    api.get(`/philosophy/decision-hierarchy/${id}`),
  createDecisionHierarchyLevel: (data: {
    level: number;
    stakeholder: string;
    description?: string | null;
    weight: number;
  }) => api.post('/philosophy/decision-hierarchy', data),
  updateDecisionHierarchyLevel: (
    id: string,
    data: {
      level?: number;
      stakeholder?: string;
      description?: string | null;
      weight?: number;
    }
  ) => api.put(`/philosophy/decision-hierarchy/${id}`, data),
  deleteDecisionHierarchyLevel: (id: string) =>
    api.delete(`/philosophy/decision-hierarchy/${id}`),

  // Validations
  validate: (data: { recommendationText: string; chatHistoryId?: string }) =>
    api.post('/philosophy/validate', data),
  getRecentValidations: (limit?: number) =>
    api.get('/philosophy/validations/recent', { params: { limit } }),
  getValidationDetail: (id: string) => api.get(`/philosophy/validations/${id}`),
};

// Fiscal Year Planning API
export const fiscalPlanningApi = {
  createPlan: (data: any) => api.post('/fiscal-planning/plans', data),
  getAllPlans: () => api.get('/fiscal-planning/plans'),
  getActivePlan: () => api.get('/fiscal-planning/plans/active'),
  getPlanById: (planId: string) => api.get(`/fiscal-planning/plans/${planId}`),
  getPlanSummary: (planId: string) => api.get(`/fiscal-planning/plans/${planId}/summary`),
  activatePlan: (planId: string) => api.post(`/fiscal-planning/plans/${planId}/activate`),
  updatePriorities: (planId: string, data: any) => api.post(`/fiscal-planning/plans/${planId}/priorities`, data),
  importPriority: (planId: string, data: any) => api.post(`/fiscal-planning/plans/${planId}/priorities/import`, data),
  addStrategy: (planId: string, data: any) => api.post(`/fiscal-planning/plans/${planId}/strategies`, data),
  bulkAddStrategies: (planId: string, data: any) => api.post(`/fiscal-planning/plans/${planId}/strategies/bulk`, data),
  updateStrategyStatus: (strategyId: string, data: any) => api.patch(`/fiscal-planning/strategies/${strategyId}`, data),
  convertToOGSM: (planId: string, data: any) => api.post(`/fiscal-planning/plans/${planId}/convert-to-ogsm`, data),
  createKPIsFromStrategy: (strategyId: string, data: any) => api.post(`/fiscal-planning/strategies/${strategyId}/create-kpis`, data),
  getStrategyKPIsCount: (strategyId: string) => api.get(`/fiscal-planning/strategies/${strategyId}/kpis/count`),
};
