import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, kpisApi } from '@/lib/api';
import { Plus, FileText, Trash2, Download, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

// ---------------------------------------------------------------------------
// Types matching the backend `reportTemplateDefinitions` (kept inline rather
// than imported from a shared module — backend and frontend types are
// duplicated by convention in this repo).
// ---------------------------------------------------------------------------
interface TemplateParameter {
  name: string;
  type: 'user' | 'date' | 'string' | 'number';
  label: string;
  required: boolean;
  description?: string;
  default?: string | number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: string;
  parameters: TemplateParameter[];
  data_sources: string[];
}

const legacyReportTypes = [
  { value: '30_day', label: '30 Day Report' },
  { value: '60_day', label: '60 Day Report' },
  { value: '90_day', label: '90 Day Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'custom', label: 'Custom Report' },
];

// ---------------------------------------------------------------------------
// User picker source (R-2 v1):
// There is no formal `usersApi` in this codebase. For the "user" parameter
// type we collect distinct ownership strings + persons_responsible entries
// from existing KPIs. This is the same identifier shape the backend uses to
// match KPIs in `reportTemplates.ts`.
// ---------------------------------------------------------------------------
function useUserOptions() {
  const { data: kpis } = useQuery({
    queryKey: ['kpis-for-user-picker'],
    queryFn: () => kpisApi.getAll().then((r) => r.data),
  });

  return useMemo(() => {
    const set = new Set<string>();
    (kpis || []).forEach((k: any) => {
      if (k.ownership && typeof k.ownership === 'string') {
        const trimmed = k.ownership.trim();
        if (trimmed) set.add(trimmed);
      }
      if (Array.isArray(k.persons_responsible)) {
        k.persons_responsible.forEach((p: string) => {
          if (p && p.trim()) set.add(p.trim());
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [kpis]);
}

// ---------------------------------------------------------------------------
// Parameter form for a chosen template.
// ---------------------------------------------------------------------------
function TemplateParamForm({
  template,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  template: ReportTemplate;
  initialValues?: Record<string, any>;
  onSubmit: (params: Record<string, any>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const userOptions = useUserOptions();

  const [values, setValues] = useState<Record<string, any>>(() => {
    const seed: Record<string, any> = {};
    template.parameters.forEach((p) => {
      if (initialValues && initialValues[p.name] !== undefined) {
        seed[p.name] = initialValues[p.name];
      } else if (p.default !== undefined) {
        seed[p.name] = p.default;
      } else {
        seed[p.name] = '';
      }
    });
    return seed;
  });

  const set = (name: string, value: any) => setValues((v) => ({ ...v, [name]: value }));

  const canSubmit = template.parameters.every(
    (p) => !p.required || (values[p.name] !== '' && values[p.name] !== undefined && values[p.name] !== null)
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
        {template.data_sources?.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Data sources used
            </summary>
            <ul className="mt-2 list-disc pl-5 text-xs text-gray-600 space-y-1">
              {template.data_sources.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {template.parameters.map((p) => (
        <div key={p.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {p.label}
            {p.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {p.type === 'user' ? (
            <input
              list={`user-options-${p.name}`}
              value={values[p.name] || ''}
              onChange={(e) => set(p.name, e.target.value)}
              className="input"
              placeholder="Type a name or pick one"
            />
          ) : p.type === 'date' ? (
            <input
              type="text"
              value={values[p.name] || ''}
              onChange={(e) => set(p.name, e.target.value)}
              className="input"
              placeholder="YYYY-MM (e.g. 2026-04)"
            />
          ) : p.type === 'number' ? (
            <input
              type="number"
              value={values[p.name] ?? ''}
              onChange={(e) => set(p.name, e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
            />
          ) : (
            <input
              type="text"
              value={values[p.name] || ''}
              onChange={(e) => set(p.name, e.target.value)}
              className="input"
            />
          )}
          {p.type === 'user' && (
            <datalist id={`user-options-${p.name}`}>
              {userOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          )}
          {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
        </div>
      ))}

      <div className="flex space-x-3">
        <button
          onClick={() => onSubmit(values)}
          disabled={!canSubmit || isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Generating…' : submitLabel}
        </button>
        <button onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Reports() {
  // UI state machine for the generation panel
  type Mode = 'idle' | 'gallery' | 'params' | 'advanced';
  const [mode, setMode] = useState<Mode>('idle');
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [advancedReport, setAdvancedReport] = useState({
    report_type: '30_day',
    title: '',
    timeframe: '',
  });

  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => aiApi.getReports().then((res) => res.data),
  });

  const { data: templates } = useQuery<ReportTemplate[]>({
    queryKey: ['report-templates'],
    queryFn: () => aiApi.getReportTemplates().then((res) => res.data),
  });

  const fromTemplateMutation = useMutation({
    mutationFn: ({ templateId, params }: { templateId: string; params: Record<string, any> }) =>
      aiApi.generateFromTemplate(templateId, params),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(res.data);
      setMode('idle');
      setActiveTemplate(null);
    },
  });

  const advancedMutation = useMutation({
    mutationFn: (data: any) => aiApi.generateReport(data.report_type, data.title, data.timeframe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setMode('idle');
      setAdvancedReport({ report_type: '30_day', title: '', timeframe: '' });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: ({ templateId, params }: { templateId: string; params: Record<string, any> }) =>
      aiApi.generateFromTemplate(templateId, params),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(res.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(null);
    },
  });

  const handleAdvancedGenerate = () => {
    if (advancedReport.title) {
      advancedMutation.mutate(advancedReport);
    }
  };

  const handleExport = () => {
    if (!selectedReport?.content) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedReport.title}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}h1,h2,h3{color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}code{background:#f0f0f0;padding:2px 6px;border-radius:3px}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}</style></head><body>${selectedReport.content.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedReport.title.replace(/\s+/g, '_')}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  // R-3 stub: Refresh re-runs the same template + params if metadata is present.
  // Full scheduling (cron) is out of scope for this PR.
  const canRefresh = Boolean(
    selectedReport?.metadata?.template_id && selectedReport?.metadata?.params
  );
  const handleRefresh = () => {
    if (!canRefresh) return;
    refreshMutation.mutate({
      templateId: selectedReport.metadata.template_id,
      params: selectedReport.metadata.params,
    });
  };

  const individualTemplate = templates?.find((t) => t.id === 'individual_report');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategic Reports</h1>
          <p className="mt-2 text-gray-600">
            Generate and manage AI-powered strategic reports
          </p>
        </div>
        <div className="flex gap-2">
          {individualTemplate && (
            <button
              onClick={() => {
                setActiveTemplate(individualTemplate);
                setMode('params');
              }}
              className="btn btn-secondary flex items-center"
              title="Generate an individual 1:1 prep report"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Individual report
            </button>
          )}
          <button
            onClick={() => setMode('gallery')}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New report
          </button>
        </div>
      </div>

      {/* Template gallery */}
      {mode === 'gallery' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pick a report template</h3>
            <button onClick={() => setMode('idle')} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templates || []).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTemplate(t);
                  setMode('params');
                }}
                className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <h4 className="font-semibold text-gray-900">{t.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{t.description}</p>
              </button>
            ))}
            <button
              onClick={() => setMode('advanced')}
              className="text-left p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              <h4 className="font-semibold text-gray-900">Custom (advanced)</h4>
              <p className="text-sm text-gray-600 mt-1">
                Free-text title + report type. No data scoping — output may include
                unrelated entities.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Parameter form for an active template */}
      {mode === 'params' && activeTemplate && (
        <div className="card">
          <TemplateParamForm
            template={activeTemplate}
            isSubmitting={fromTemplateMutation.isPending}
            submitLabel="Generate"
            onCancel={() => {
              setMode('idle');
              setActiveTemplate(null);
            }}
            onSubmit={(params) =>
              fromTemplateMutation.mutate({ templateId: activeTemplate.id, params })
            }
          />
          {fromTemplateMutation.isError && (
            <p className="text-sm text-red-600 mt-3">
              {(fromTemplateMutation.error as any)?.response?.data?.error ||
                'Failed to generate report.'}
            </p>
          )}
        </div>
      )}

      {/* Advanced (free-text) form */}
      {mode === 'advanced' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Custom (advanced) report</h3>
          <p className="text-xs text-gray-500 mb-4">
            Free-text generation. Output may include entities outside the intended subject.
            Prefer a template if one fits your need.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={advancedReport.report_type}
                onChange={(e) => setAdvancedReport({ ...advancedReport, report_type: e.target.value })}
                className="input"
              >
                {legacyReportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={advancedReport.title}
                onChange={(e) => setAdvancedReport({ ...advancedReport, title: e.target.value })}
                className="input"
                placeholder="e.g., Q1 2025 Strategic Progress"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeframe (Optional)
              </label>
              <input
                type="text"
                value={advancedReport.timeframe}
                onChange={(e) => setAdvancedReport({ ...advancedReport, timeframe: e.target.value })}
                className="input"
                placeholder="e.g., January 2025 - March 2025"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAdvancedGenerate}
                disabled={advancedMutation.isPending}
                className="btn btn-primary"
              >
                {advancedMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => setMode('idle')} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports</h2>
            {isLoading ? (
              <p className="text-gray-600">Loading reports...</p>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report: any) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedReport?.id === report.id
                        ? 'bg-primary-50 border-2 border-primary-600'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          {report.metadata?.template_id && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium uppercase tracking-wide">
                              template
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No reports generated yet.</p>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedReport.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedReport.report_type?.replace('_', ' ')} — Generated on {format(new Date(selectedReport.created_at), 'MMMM dd, yyyy')}
                  </p>
                  {selectedReport.metadata?.template_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Template: <code className="bg-gray-100 px-1 rounded">{selectedReport.metadata.template_id}</code>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {canRefresh && (
                    <button
                      onClick={handleRefresh}
                      disabled={refreshMutation.isPending}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh — re-run the same template with the same parameters"
                    >
                      <RefreshCw className={`h-5 w-5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button onClick={handleExport} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Export as HTML">
                    <Download className="h-5 w-5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(selectedReport.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="prose prose-blue max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-700">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    code: ({ className, children }: any) => {
                      const isInline = !className;
                      return isInline
                        ? <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">{children}</code>
                        : <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><code className="text-sm font-mono">{children}</code></pre>;
                    },
                    table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="min-w-full border-collapse border">{children}</table></div>,
                    th: ({ children }) => <th className="border px-3 py-2 bg-gray-50 text-left text-sm font-semibold">{children}</th>,
                    td: ({ children }) => <td className="border px-3 py-2 text-sm">{children}</td>,
                  }}
                >
                  {selectedReport.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a report to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
