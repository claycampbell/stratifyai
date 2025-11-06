import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpisApi, kpiCategoriesApi } from '@/lib/api';
import { KPICategory } from '@/types';
import { Plus, Upload, Trash2, Filter, X, Sparkles, LayoutGrid, List, Rows, Settings } from 'lucide-react';
import KPIDetailModal from '@/components/KPIDetailModal';
import KPITemplatesBrowser from '@/components/KPITemplatesBrowser';
import KPIViews from '@/components/KPIViews';
import KPICategoryTabs from '@/components/KPICategoryTabs';
import CategoryManagementModal from '@/components/CategoryManagementModal';
import { usePreference } from '@/contexts/UserPreferencesContext';

export default function KPIs() {
  const [viewMode, setViewMode] = usePreference('kpi_dashboard_view');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
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
    ownership: '',
    persons_responsible: [] as string[],
    category_id: '',
  });

  const queryClient = useQueryClient();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  // Fetch categories for selector
  const { data: categories } = useQuery<KPICategory[]>({
    queryKey: ['kpi-categories'],
    queryFn: () => kpiCategoriesApi.getAll().then((res) => res.data),
  });

  // Extract unique ownership/persons from KPIs
  const availablePersons = useMemo(() => {
    if (!kpis) return [];
    const persons = new Set<string>();
    kpis.forEach((kpi: any) => {
      // Use new ownership field directly
      if (kpi.ownership) {
        persons.add(kpi.ownership);
      }
      // Also include persons_responsible
      if (kpi.persons_responsible && Array.isArray(kpi.persons_responsible)) {
        kpi.persons_responsible.forEach((person: string) => persons.add(person));
      }
    });
    return Array.from(persons).sort();
  }, [kpis]);

  // Apply filters
  const filteredKpis = useMemo(() => {
    if (!kpis) return [];

    return kpis.filter((kpi: any) => {
      // Category filter
      if (categoryFilter !== null) {
        if (kpi.category_id !== categoryFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && kpi.status !== statusFilter) {
        return false;
      }

      // Person/Ownership filter
      if (personFilter !== 'all') {
        // Check ownership or persons_responsible
        const hasMatch =
          kpi.ownership === personFilter ||
          (kpi.persons_responsible && kpi.persons_responsible.includes(personFilter));

        if (!hasMatch) {
          return false;
        }
      }

      return true;
    });
  }, [kpis, categoryFilter, statusFilter, personFilter]);

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
        ownership: '',
        persons_responsible: [],
        category_id: '',
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kpisApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setImportStatus({
        show: true,
        message: 'KPI deleted successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      setImportStatus({
        show: true,
        message: error.response?.data?.error || 'Failed to delete KPI',
        type: 'error',
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all KPIs one by one
      if (kpis) {
        await Promise.all(kpis.map((kpi: any) => kpisApi.delete(kpi.id)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setShowDeleteAllConfirm(false);
      setImportStatus({
        show: true,
        message: 'All KPIs deleted successfully',
        type: 'success',
      });
    },
    onError: () => {
      setImportStatus({
        show: true,
        message: 'Failed to delete all KPIs',
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the detail modal
    if (confirm('Are you sure you want to delete this KPI?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Key Performance Indicators</h1>
          <p className="mt-2 text-gray-600">Track and manage your KPIs</p>
        </div>
        <div className="flex gap-3">
          {/* View Mode Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('boxes')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'boxes'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Box View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'compact'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Compact View"
            >
              <Rows className="h-4 w-4" />
            </button>
          </div>

          {kpis && kpis.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </button>
          )}
          <button
            onClick={() => setShowCategoryManagement(true)}
            className="btn btn-secondary flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Categories
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="btn btn-secondary flex items-center"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Browse Templates
          </button>
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

      {/* Category Tabs */}
      {kpis && kpis.length > 0 && (
        <KPICategoryTabs
          selectedCategoryId={categoryFilter}
          onSelectCategory={setCategoryFilter}
          kpis={kpis}
        />
      )}

      {/* Filters Section */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1.5 px-3"
            >
              <option value="all">All Statuses</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>

          {/* Person/Ownership Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Ownership:</label>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1.5 px-3"
            >
              <option value="all">All Owners</option>
              {availablePersons.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters Display & Clear */}
          {(statusFilter !== 'all' || personFilter !== 'all' || categoryFilter !== null) && (
            <>
              <div className="flex items-center gap-2">
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Status: {statusFilter.replace('_', ' ')}
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {personFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Owner: {personFilter}
                    <button
                      onClick={() => setPersonFilter('all')}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPersonFilter('all');
                  setCategoryFilter(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear all
              </button>
            </>
          )}

          {/* Results Count */}
          <div className={`text-sm text-gray-600 ${statusFilter === 'all' && personFilter === 'all' && categoryFilter === null ? 'ml-auto' : ''}`}>
            Showing {filteredKpis?.length || 0} of {kpis?.length || 0} KPIs
          </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newKPI.category_id}
                onChange={(e) => setNewKPI({ ...newKPI, category_id: e.target.value })}
                className="input"
              >
                <option value="">Uncategorized</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ownership (Primary)
              </label>
              <input
                type="text"
                value={newKPI.ownership}
                onChange={(e) => setNewKPI({ ...newKPI, ownership: e.target.value })}
                className="input"
                placeholder="Primary person responsible"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persons Responsible (Secondary)
              </label>
              <input
                type="text"
                value={newKPI.persons_responsible.join(', ')}
                onChange={(e) => setNewKPI({
                  ...newKPI,
                  persons_responsible: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="input"
                placeholder="Enter names separated by commas"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple names with commas</p>
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

      {/* KPIs Display - Supports Boxes, List, and Compact views */}
      <KPIViews
        kpis={filteredKpis || []}
        isLoading={isLoading}
        viewMode={viewMode || 'boxes'}
        onKPIClick={(id) => setSelectedKpiId(id)}
        onKPIDelete={handleDelete}
      />

      {/* KPI Templates Browser */}
      {showTemplates && <KPITemplatesBrowser onClose={() => setShowTemplates(false)} />}

      {/* KPI Detail Modal */}
      {selectedKpiId && (
        <KPIDetailModal kpiId={selectedKpiId} onClose={() => setSelectedKpiId(null)} />
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete All KPIs?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all KPIs? This action cannot be undone and will
              permanently remove all {kpis?.length || 0} KPI(s) from the system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="btn btn-secondary"
                disabled={deleteAllMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteAllMutation.isPending}
              >
                {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={showCategoryManagement}
        onClose={() => setShowCategoryManagement(false)}
      />
    </div>
  );
}
