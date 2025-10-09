import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import { Upload, FileText, Trash2, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Documents() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getAll().then((res) => res.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
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
      uploadMutation.mutate(selectedFile);
    }
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
