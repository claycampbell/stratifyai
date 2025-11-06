import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpiCategoriesApi } from '@/lib/api';
import { KPICategory } from '@/types';
import { X, Plus, Edit2, Trash2, Folder, Save, XCircle } from 'lucide-react';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
}: CategoryManagementModalProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Folder',
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const { data: categories, isLoading } = useQuery<KPICategory[]>({
    queryKey: ['kpi-categories'],
    queryFn: () => kpiCategoriesApi.getAll().then((res) => res.data),
    enabled: isOpen,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => kpiCategoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-categories'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setIsCreating(false);
      resetForm();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create category');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; color?: string; icon?: string };
    }) => kpiCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-categories'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setEditingId(null);
      resetForm();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update category');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => kpiCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-categories'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to delete category');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'Folder',
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      icon: formData.icon,
    });
  };

  const handleUpdate = (categoryId: string) => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    updateMutation.mutate({
      id: categoryId,
      data: {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
        icon: formData.icon,
      },
    });
  };

  const startEditing = (category: KPICategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      icon: category.icon || 'Folder',
    });
    setIsCreating(false);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
    setError(null);
  };

  const handleDelete = (category: KPICategory) => {
    if (category.is_default) {
      setError('Cannot delete the default "Uncategorized" category');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete "${category.name}"? All KPIs in this category will be moved to Uncategorized.`
      )
    ) {
      deleteMutation.mutate(category.id);
    }
  };

  const predefinedColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Gray', value: '#6B7280' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage KPI Categories
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create, edit, and organize your KPI categories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Create New Category Button */}
          {!isCreating && !editingId && (
            <button
              onClick={() => {
                setIsCreating(true);
                resetForm();
                setError(null);
              }}
              className="w-full mb-6 px-4 py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border-2 border-dashed border-primary-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Category</span>
            </button>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {isCreating ? 'Create New Category' : 'Edit Category'}
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Customer Success"
                    className="w-full input"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what this category is for..."
                    className="w-full input"
                    rows={2}
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                      title="Custom color"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      isCreating ? handleCreate() : handleUpdate(editingId!)
                    }
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isCreating ? 'Create Category' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Existing Categories
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading categories...
              </div>
            ) : !categories || categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No categories found
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    editingId === category.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Category Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Color Indicator */}
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{
                          backgroundColor: `${category.color}20` || '#3B82F620',
                        }}
                      >
                        <Folder
                          className="h-5 w-5"
                          style={{ color: category.color || '#3B82F6' }}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {category.name}
                          </h4>
                          {category.is_default && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEditing(category)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {!category.is_default && (
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-600">
            {categories?.length || 0} categories total
          </p>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
