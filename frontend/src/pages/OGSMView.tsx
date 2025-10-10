import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ogsmApi } from '@/lib/api';
import { Plus, Trash2, Copy, List, Network, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import OGSMTreeView from '@/components/OGSMTreeView';
import OGSMTemplatesDialog from '@/components/OGSMTemplatesDialog';

const componentTypes = ['objective', 'goal', 'strategy', 'measure'] as const;

export default function OGSMView() {
  const [searchParams] = useSearchParams();
  const filterFromUrl = searchParams.get('filter');
  const [selectedType, setSelectedType] = useState<string>(filterFromUrl || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newComponent, setNewComponent] = useState({
    component_type: 'objective',
    title: '',
    description: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (filterFromUrl) {
      setSelectedType(filterFromUrl);
    }
  }, [filterFromUrl]);

  const { data: components, isLoading } = useQuery({
    queryKey: ['ogsm', selectedType],
    queryFn: () =>
      ogsmApi
        .getAll(selectedType !== 'all' ? { type: selectedType } : undefined)
        .then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => ogsmApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogsm'] });
      setIsCreating(false);
      setNewComponent({ component_type: 'objective', title: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ogsmApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogsm'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, includeChildren }: { id: string; includeChildren: boolean }) =>
      ogsmApi.duplicate(id, includeChildren),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogsm'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; order_index?: number; parent_id?: string | null }>) =>
      ogsmApi.bulkReorder(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogsm'] });
    },
  });

  const handleCreate = () => {
    if (newComponent.title) {
      createMutation.mutate(newComponent);
    }
  };

  const handleDuplicate = (id: string) => {
    const confirm = window.confirm(
      'Do you want to duplicate this component including all its children?'
    );
    duplicateMutation.mutate({ id, includeChildren: confirm });
  };

  const handleReorder = (updates: Array<{ id: string; order_index?: number; parent_id?: string | null }>) => {
    reorderMutation.mutate(updates);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      objective: 'bg-blue-100 text-blue-800',
      goal: 'bg-green-100 text-green-800',
      strategy: 'bg-purple-100 text-purple-800',
      measure: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Strategy Platform</h1>
          <p className="mt-2 text-gray-600">
            Manage Objectives, Goals, Strategies, and Measures
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn btn-secondary flex items-center"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Use Template
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </button>
        </div>
      </div>

      {/* Filter Tabs and View Toggle */}
      <div className="card">
        <div className="flex justify-between items-center border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 text-sm font-medium ${
                selectedType === 'all'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            {componentTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  selectedType === type
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type === 'strategy' ? 'Strategies' : `${type}s`}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 px-4">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'tree'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Hierarchy view"
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Component</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newComponent.component_type}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, component_type: e.target.value })
                }
                className="input"
              >
                {componentTypes.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newComponent.title}
                onChange={(e) => setNewComponent({ ...newComponent, title: e.target.value })}
                className="input"
                placeholder="Enter component title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newComponent.description}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, description: e.target.value })
                }
                className="input"
                rows={3}
                placeholder="Enter component description"
              />
            </div>
            <div className="flex space-x-3">
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

      {/* Components List/Tree View */}
      <div className="card">
        {isLoading ? (
          <p className="text-gray-600 p-4">Loading components...</p>
        ) : components && components.length > 0 ? (
          viewMode === 'tree' ? (
            <OGSMTreeView
              components={components}
              onDuplicate={handleDuplicate}
              onDelete={(id) => deleteMutation.mutate(id)}
              onReorder={handleReorder}
            />
          ) : (
            <div className="space-y-3 p-4">
              {components.map((component: any) => (
                <div
                  key={component.id}
                  className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getTypeColor(
                          component.component_type
                        )}`}
                      >
                        {component.component_type}
                      </span>
                      <h3 className="font-semibold text-gray-900">{component.title}</h3>
                    </div>
                    {component.description && (
                      <p className="text-sm text-gray-600">{component.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(component.id)}
                      disabled={duplicateMutation.isPending}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Duplicate component"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(component.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete component"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-gray-600 p-4">No components found. Create your first component!</p>
        )}
      </div>

      {/* Templates Dialog */}
      <OGSMTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
    </div>
  );
}
