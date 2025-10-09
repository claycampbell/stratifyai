import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpiEnhancementsApi } from '@/lib/api';
import { X, Plus, Sparkles, TrendingUp, DollarSign, Users, Target, Briefcase, Heart, Code, Trophy } from 'lucide-react';

interface KPITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  target_value: number;
  unit: string;
  frequency: string;
  at_risk_threshold: number;
  off_track_threshold: number;
  validation_rules: any;
}

interface KPITemplatesBrowserProps {
  onClose: () => void;
  onTemplateSelected?: (template: KPITemplate) => void;
}

const categoryIcons: Record<string, any> = {
  sales: DollarSign,
  marketing: TrendingUp,
  operations: Briefcase,
  finance: DollarSign,
  hr: Users,
  customer_service: Heart,
  product: Code,
  athletics: Trophy,
};

const categoryColors: Record<string, string> = {
  sales: 'bg-green-100 text-green-800 border-green-300',
  marketing: 'bg-blue-100 text-blue-800 border-blue-300',
  operations: 'bg-purple-100 text-purple-800 border-purple-300',
  finance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hr: 'bg-pink-100 text-pink-800 border-pink-300',
  customer_service: 'bg-red-100 text-red-800 border-red-300',
  product: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  athletics: 'bg-orange-100 text-orange-800 border-orange-300',
};

export default function KPITemplatesBrowser({ onClose, onTemplateSelected }: KPITemplatesBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<KPITemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKPI, setNewKPI] = useState({
    name: '',
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['kpi-templates', selectedCategory],
    queryFn: () =>
      kpiEnhancementsApi
        .getTemplates(selectedCategory === 'all' ? undefined : selectedCategory)
        .then((res) => res.data),
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: (data: { templateId: string; name: string; description: string }) =>
      kpiEnhancementsApi.createFromTemplate(data.templateId, {
        name: data.name,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setShowCreateForm(false);
      setSelectedTemplate(null);
      onClose();
    },
  });

  const categories = [
    { value: 'all', label: 'All Categories', icon: Target },
    { value: 'sales', label: 'Sales', icon: DollarSign },
    { value: 'marketing', label: 'Marketing', icon: TrendingUp },
    { value: 'operations', label: 'Operations', icon: Briefcase },
    { value: 'finance', label: 'Finance', icon: DollarSign },
    { value: 'hr', label: 'Human Resources', icon: Users },
    { value: 'customer_service', label: 'Customer Service', icon: Heart },
    { value: 'product', label: 'Product', icon: Code },
    { value: 'athletics', label: 'Athletics', icon: Trophy },
  ];

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate || !newKPI.name) return;

    createFromTemplateMutation.mutate({
      templateId: selectedTemplate.id,
      name: newKPI.name,
      description: newKPI.description,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
              KPI Templates Library
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose from {templates?.length || 0} pre-built templates across multiple categories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-600">Loading templates...</div>
            ) : templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template: KPITemplate) => {
                  const Icon = categoryIcons[template.category] || Target;
                  const colorClass = categoryColors[template.category] || 'bg-gray-100 text-gray-800';

                  return (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowCreateForm(true);
                        setNewKPI({
                          name: template.name,
                          description: template.description || '',
                        });
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                          {template.category.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Target: {template.target_value} {template.unit}</span>
                        <span className="capitalize">{template.frequency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                No templates found in this category.
              </div>
            )}
          </div>
        </div>

        {/* Create Form (Bottom Drawer) */}
        {showCreateForm && selectedTemplate && (
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create KPI from: {selectedTemplate.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                <input
                  type="text"
                  value={newKPI.name}
                  onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                  className="input w-full"
                  placeholder="Enter custom name or use template name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newKPI.description}
                  onChange={(e) => setNewKPI({ ...newKPI, description: e.target.value })}
                  className="input w-full"
                  placeholder="Add custom description"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Template Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Target:</span>
                  <span className="ml-2 font-medium">{selectedTemplate.target_value} {selectedTemplate.unit}</span>
                </div>
                <div>
                  <span className="text-gray-600">Frequency:</span>
                  <span className="ml-2 font-medium capitalize">{selectedTemplate.frequency}</span>
                </div>
                <div>
                  <span className="text-gray-600">At Risk:</span>
                  <span className="ml-2 font-medium">{(selectedTemplate.at_risk_threshold * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Off Track:</span>
                  <span className="ml-2 font-medium">{(selectedTemplate.off_track_threshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedTemplate(null);
                }}
                className="btn btn-secondary"
                disabled={createFromTemplateMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFromTemplate}
                disabled={createFromTemplateMutation.isPending || !newKPI.name}
                className="btn btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createFromTemplateMutation.isPending ? 'Creating...' : 'Create KPI'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
