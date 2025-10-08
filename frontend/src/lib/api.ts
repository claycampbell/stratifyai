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

export default api;
