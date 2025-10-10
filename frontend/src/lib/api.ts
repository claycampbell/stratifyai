import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// AI API
export const aiApi = {
  chat: (message: string, sessionId?: string, context?: any) =>
    api.post('/ai/chat', { message, session_id: sessionId, context }),
  getChatHistory: (sessionId: string) => api.get(`/ai/chat/${sessionId}`),
  analyze: (type: string) => api.post('/ai/analyze', { type }),
  generateReport: (reportType: string, title: string, timeframe?: string) =>
    api.post('/ai/reports/generate', { report_type: reportType, title, timeframe }),
  getReports: (reportType?: string) => api.get('/ai/reports', { params: { report_type: reportType } }),
  getReportById: (id: string) => api.get(`/ai/reports/${id}`),
  deleteReport: (id: string) => api.delete(`/ai/reports/${id}`),
  getRecommendations: () => api.post('/ai/recommendations'),
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

export default api;
