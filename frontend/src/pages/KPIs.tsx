import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpisApi } from '@/lib/api';
import { Plus, TrendingUp, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import KPIDetailModal from '@/components/KPIDetailModal';

const statusColors = {
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-yellow-100 text-yellow-800',
  off_track: 'bg-red-100 text-red-800',
};

const statusIcons = {
  on_track: CheckCircle,
  at_risk: AlertCircle,
  off_track: AlertCircle,
};

export default function KPIs() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newKPI, setNewKPI] = useState({
    name: '',
    description: '',
    target_value: '',
    current_value: '',
    unit: '',
    frequency: 'monthly',
    status: 'on_track',
  });

  const queryClient = useQueryClient();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  const filteredKpis = statusFilter
    ? kpis?.filter((kpi: any) => kpi.status === statusFilter)
    : kpis;

  const createMutation = useMutation({
    mutationFn: (data: any) => kpisApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setIsCreating(false);
      setNewKPI({
        name: '',
        description: '',
        target_value: '',
        current_value: '',
        unit: '',
        frequency: 'monthly',
        status: 'on_track',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => kpisApi.importFromCSV(file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      const { imported, errors } = response.data;
      setImportStatus({
        show: true,
        message: `Successfully imported ${imported} KPI(s). ${errors > 0 ? `${errors} error(s) occurred.` : ''}`,
        type: errors > 0 ? 'info' : 'success',
      });
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      setImportStatus({
        show: true,
        message: error.response?.data?.error || 'Failed to import KPIs from CSV',
        type: 'error',
      });
    },
  });

  const handleCreate = () => {
    if (newKPI.name) {
      const data = {
        ...newKPI,
        target_value: newKPI.target_value ? parseFloat(newKPI.target_value) : null,
        current_value: newKPI.current_value ? parseFloat(newKPI.current_value) : null,
      };
      createMutation.mutate(data);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        setImportStatus({
          show: true,
          message: 'Please upload a CSV or Excel file',
          type: 'error',
        });
        return;
      }
      importMutation.mutate(file);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Key Performance Indicators</h1>
          <p className="mt-2 text-gray-600">Track and manage your KPIs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportClick}
            disabled={importMutation.isPending}
            className="btn btn-secondary flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? 'Importing...' : 'Import from CSV'}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add KPI
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Import Status Message */}
      {importStatus.show && (
        <div
          className={`p-4 rounded-lg ${
            importStatus.type === 'success'
              ? 'bg-green-100 text-green-800'
              : importStatus.type === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          <div className="flex justify-between items-start">
            <p>{importStatus.message}</p>
            <button
              onClick={() => setImportStatus({ show: false, message: '', type: 'info' })}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New KPI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newKPI.name}
                onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                className="input"
                placeholder="Enter KPI name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newKPI.description}
                onChange={(e) => setNewKPI({ ...newKPI, description: e.target.value })}
                className="input"
                rows={2}
                placeholder="Enter KPI description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Value
              </label>
              <input
                type="number"
                value={newKPI.target_value}
                onChange={(e) => setNewKPI({ ...newKPI, target_value: e.target.value })}
                className="input"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Value
              </label>
              <input
                type="number"
                value={newKPI.current_value}
                onChange={(e) => setNewKPI({ ...newKPI, current_value: e.target.value })}
                className="input"
                placeholder="75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={newKPI.unit}
                onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
                className="input"
                placeholder="e.g., %, $, users"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={newKPI.frequency}
                onChange={(e) => setNewKPI({ ...newKPI, frequency: e.target.value })}
                className="input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setIsCreating(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-gray-600">Loading KPIs...</p>
        ) : filteredKpis && filteredKpis.length > 0 ? (
          filteredKpis.map((kpi: any) => {
            const StatusIcon = statusIcons[kpi.status as keyof typeof statusIcons];

            // Parse description to extract fields
            const descParts = kpi.description ? kpi.description.split(' | ') : [];
            const fields: Record<string, string> = {};
            descParts.forEach((part: string) => {
              const [key, ...valueParts] = part.split(': ');
              if (key && valueParts.length > 0) {
                fields[key] = valueParts.join(': ');
              }
            });

            return (
              <div
                key={kpi.id}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedKpiId(kpi.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{kpi.name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[kpi.status as keyof typeof statusColors]
                      }`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {kpi.status.replace('_', ' ')}
                    </span>
                  </div>
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>

                <div className="space-y-2">
                  {fields.Lead && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Lead</span>
                      <span className="font-semibold">{fields.Lead}</span>
                    </div>
                  )}
                  {fields.Goal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Goal</span>
                      <span className="font-semibold">{fields.Goal}</span>
                    </div>
                  )}
                  {fields.Start && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Start Date</span>
                      <span className="font-semibold">{fields.Start}</span>
                    </div>
                  )}
                  {fields.End && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">End Date</span>
                      <span className="font-semibold">{fields.End}</span>
                    </div>
                  )}
                  {fields.Notes && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-600 font-medium">Notes:</span>
                      <p className="text-sm text-gray-700 mt-1">{fields.Notes}</p>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500 capitalize">
                      Frequency: {kpi.frequency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-600">No KPIs found. Create your first KPI!</p>
          </div>
        )}
      </div>

      {/* KPI Detail Modal */}
      {selectedKpiId && (
        <KPIDetailModal kpiId={selectedKpiId} onClose={() => setSelectedKpiId(null)} />
      )}
    </div>
  );
}
