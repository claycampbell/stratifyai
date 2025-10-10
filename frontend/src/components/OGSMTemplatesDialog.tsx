import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ogsmTemplatesApi } from '@/lib/api';
import { X, Search, Sparkles, Folder } from 'lucide-react';
import type { OGSMTemplate } from '@/types';

interface OGSMTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (templateId: string) => void;
}

export default function OGSMTemplatesDialog({ isOpen, onClose, onApply }: OGSMTemplatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['ogsm-templates'],
    queryFn: () => ogsmTemplatesApi.getAll().then((res) => res.data),
    enabled: isOpen,
  });

  const applyMutation = useMutation({
    mutationFn: (templateId: string) => ogsmTemplatesApi.apply(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogsm'] });
      onClose();
      if (onApply) {
        // Template ID would be passed here if needed
      }
    },
  });

  if (!isOpen) return null;

  // Get unique categories
  const categories: string[] = templates
    ? ['all', ...Array.from(new Set(templates.map((t: OGSMTemplate) => t.category).filter(Boolean))) as string[]]
    : ['all'];

  // Filter templates
  const filteredTemplates = templates?.filter((template: OGSMTemplate) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApply = (templateId: string) => {
    if (window.confirm('Apply this template? This will create new components based on the template structure.')) {
      applyMutation.mutate(templateId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">OGSM Templates</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a template to quickly create your strategic framework
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-600">Loading templates...</p>
              </div>
            ) : filteredTemplates && filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template: OGSMTemplate) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleApply(template.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                          <Folder className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.category && (
                            <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Used {template.usage_count || 0}x
                      </span>
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    )}

                    {/* Template Structure Preview */}
                    <div className="space-y-1 text-xs text-gray-500 bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-700 mb-1">Structure:</div>
                      {template.structure.slice(0, 3).map((item: { component_type: string; title: string; children?: any[] }, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <span className="capitalize">{item.component_type}:</span>
                          <span className="text-gray-700 font-medium">{item.title}</span>
                          {item.children && item.children.length > 0 && (
                            <span className="text-gray-400">({item.children.length} sub-items)</span>
                          )}
                        </div>
                      ))}
                      {template.structure.length > 3 && (
                        <div className="text-gray-400 italic">+{template.structure.length - 3} more...</div>
                      )}
                    </div>

                    {template.tags && template.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {template.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      className="mt-3 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? 'Applying...' : 'Apply Template'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Folder className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No templates found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredTemplates?.length || 0} template{filteredTemplates?.length !== 1 ? 's' : ''}{' '}
                available
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
