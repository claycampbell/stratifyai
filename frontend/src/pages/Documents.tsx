import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, DocumentUploadOptions } from '@/lib/api';
import { Upload, FileText, Trash2, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

// Auto-detect sensible default intents based on the file name. The user can
// always override these in the picker — this just primes the common case so
// the typical upload is still one click.
function detectDefaultIntents(file: File): {
  extract_ogsm: boolean;
  extract_kpis: boolean;
  feed_strategic_planning: boolean;
  store_only: boolean;
} {
  const name = file.name.toLowerCase();
  const hasKpiHint = /(kpi|metric|measure|scorecard|dashboard)/.test(name);
  const hasOgsmHint = /(ogsm|strateg|objective|goal)/.test(name);
  const hasCorePriorityHint = /(core[_\s-]?priorit|priorities)/.test(name);

  // If we detect a specific signal, narrow the defaults to it. Otherwise keep
  // the previous behavior (extract both).
  if (hasKpiHint && !hasOgsmHint) {
    return { extract_ogsm: false, extract_kpis: true, feed_strategic_planning: false, store_only: false };
  }
  if (hasOgsmHint && !hasKpiHint) {
    return { extract_ogsm: true, extract_kpis: false, feed_strategic_planning: false, store_only: false };
  }
  if (hasCorePriorityHint) {
    return { extract_ogsm: true, extract_kpis: false, feed_strategic_planning: true, store_only: false };
  }
  return { extract_ogsm: true, extract_kpis: true, feed_strategic_planning: false, store_only: false };
}

export default function Documents() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [intents, setIntents] = useState<DocumentUploadOptions>({
    extract_ogsm: true,
    extract_kpis: true,
    feed_strategic_planning: false,
    store_only: false,
  });
  const queryClient = useQueryClient();

  // Re-prime intent defaults whenever the user picks a new file.
  useEffect(() => {
    if (selectedFile) {
      setIntents(detectDefaultIntents(selectedFile));
    }
  }, [selectedFile]);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getAll().then((res) => res.data),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, options }: { file: File; options: DocumentUploadOptions }) =>
      documentsApi.upload(file, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedFile(null);
      // Start polling to detect when processing completes
      startPolling();
    },
  });

  // Poll for document processing updates
  const startPolling = () => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      // Check if all documents are processed
      const currentDocs = queryClient.getQueryData(['documents']) as any[];
      const allProcessed = currentDocs?.every(doc => doc.processed);

      if (allProcessed && currentDocs?.length > 0) {
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes max
    setTimeout(() => clearInterval(interval), 300000);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, options: intents });
    }
  };

  // store_only is mutually exclusive with the other extract/feed options.
  const setStoreOnly = (value: boolean) => {
    if (value) {
      setIntents({
        extract_ogsm: false,
        extract_kpis: false,
        feed_strategic_planning: false,
        store_only: true,
      });
    } else {
      // Re-derive sensible defaults from the filename when toggling back off.
      setIntents(
        selectedFile
          ? detectDefaultIntents(selectedFile)
          : {
              extract_ogsm: true,
              extract_kpis: true,
              feed_strategic_planning: false,
              store_only: false,
            }
      );
    }
  };

  const setIntent = (key: keyof DocumentUploadOptions, value: boolean) => {
    setIntents((prev) => ({ ...prev, [key]: value, store_only: false }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="mt-2 text-gray-600">
          Upload and manage strategic planning documents
        </p>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".docx,.xlsx,.xls,.txt,.md"
            className="flex-1 input"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="btn btn-primary flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Supported formats: DOCX, XLSX, XLS, TXT, MD
        </p>

        {/* Intent picker — appears only after a file is selected. Defaults are
            primed from the file name, but the user can override before upload. */}
        {selectedFile && (
          <div className="mt-5 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">
              What should we do with <span className="font-mono">{selectedFile.name}</span>?
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              We've pre-selected based on the file name. Adjust as needed before upload.
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!intents.extract_ogsm}
                  disabled={!!intents.store_only}
                  onChange={(e) => setIntent('extract_ogsm', e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  <span className="font-medium">Extract OGSM components</span>
                  <span className="block text-xs text-gray-500">
                    Pull objectives, goals, strategies, and measures into the OGSM tree.
                  </span>
                </span>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!intents.extract_kpis}
                  disabled={!!intents.store_only}
                  onChange={(e) => setIntent('extract_kpis', e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  <span className="font-medium">Extract KPIs</span>
                  <span className="block text-xs text-gray-500">
                    Identify metrics, targets, and current values to track.
                  </span>
                </span>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!intents.feed_strategic_planning}
                  disabled={!!intents.store_only}
                  onChange={(e) => setIntent('feed_strategic_planning', e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  <span className="font-medium">Feed into strategic planning bot</span>
                  <span className="block text-xs text-gray-500">
                    Use uploaded core priorities to inform AI strategic recommendations and risk analysis.
                  </span>
                </span>
              </label>

              <div className="pt-2 mt-2 border-t border-gray-200">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={!!intents.store_only}
                    onChange={(e) => setStoreOnly(e.target.checked)}
                  />
                  <span className="text-sm text-gray-800">
                    <span className="font-medium">Store as reference only — don't extract anything</span>
                    <span className="block text-xs text-gray-500">
                      Keeps the file searchable but skips OGSM/KPI extraction and strategic feeds.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Documents</h2>

        {isLoading ? (
          <p className="text-gray-600">Loading documents...</p>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{doc.original_name}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.upload_date), 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        {doc.processed ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                            Processed
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                            Processing...
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
