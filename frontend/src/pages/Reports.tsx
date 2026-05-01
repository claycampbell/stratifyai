import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Plus, FileText, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const reportTypes = [
  { value: '30_day', label: '30 Day Report' },
  { value: '60_day', label: '60 Day Report' },
  { value: '90_day', label: '90 Day Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'custom', label: 'Custom Report' },
];

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [newReport, setNewReport] = useState({
    report_type: '30_day',
    title: '',
    timeframe: '',
  });

  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => aiApi.getReports().then((res) => res.data),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => aiApi.generateReport(data.report_type, data.title, data.timeframe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setIsGenerating(false);
      setNewReport({ report_type: '30_day', title: '', timeframe: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(null);
    },
  });

  const handleGenerate = () => {
    if (newReport.title) {
      generateMutation.mutate(newReport);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategic Reports</h1>
          <p className="mt-2 text-gray-600">
            Generate and manage AI-powered strategic reports
          </p>
        </div>
        <button
          onClick={() => setIsGenerating(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Generate Form */}
      {isGenerating && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={newReport.report_type}
                onChange={(e) => setNewReport({ ...newReport, report_type: e.target.value })}
                className="input"
              >
                {reportTypes.map((type) => (
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
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
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
                value={newReport.timeframe}
                onChange={(e) => setNewReport({ ...newReport, timeframe: e.target.value })}
                className="input"
                placeholder="e.g., January 2025 - March 2025"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="btn btn-primary"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => setIsGenerating(false)} className="btn btn-secondary">
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
                    {selectedReport.report_type?.replace('_', ' day')} — Generated on {format(new Date(selectedReport.created_at), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
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
