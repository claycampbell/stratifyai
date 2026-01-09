import { useState } from 'react';
import { X, Plus, Trash2, Target, TrendingUp } from 'lucide-react';
import type { FiscalYearDraftStrategy } from '@/types';

interface CreateKPIsModalProps {
  strategy: FiscalYearDraftStrategy;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (kpisCount: number) => void;
}

interface KPIFormData {
  id: string;
  name: string;
  target_value: string;
  frequency: string;
  unit: string;
  enabled: boolean;
}

export default function CreateKPIsModal({ strategy, isOpen, onClose, onSuccess }: CreateKPIsModalProps) {
  const successMetrics = strategy.success_metrics || [];

  // Initialize form with success metrics
  const [kpis, setKpis] = useState<KPIFormData[]>(() =>
    successMetrics.map((metric, idx) => ({
      id: `kpi-${idx}`,
      name: metric,
      target_value: '',
      frequency: 'monthly',
      unit: '',
      enabled: true,
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setKpis(prev => prev.map(kpi =>
      kpi.id === id ? { ...kpi, enabled: !kpi.enabled } : kpi
    ));
  };

  const handleChange = (id: string, field: keyof KPIFormData, value: string) => {
    setKpis(prev => prev.map(kpi =>
      kpi.id === id ? { ...kpi, [field]: value } : kpi
    ));
  };

  const handleRemove = (id: string) => {
    setKpis(prev => prev.filter(kpi => kpi.id !== id));
  };

  const handleAddNew = () => {
    setKpis(prev => [...prev, {
      id: `kpi-${Date.now()}`,
      name: '',
      target_value: '',
      frequency: 'monthly',
      unit: '',
      enabled: true,
    }]);
  };

  const handleSelectAll = () => {
    setKpis(prev => prev.map(kpi => ({ ...kpi, enabled: true })));
  };

  const handleDeselectAll = () => {
    setKpis(prev => prev.map(kpi => ({ ...kpi, enabled: false })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enabledKpis = kpis.filter(kpi => kpi.enabled && kpi.name.trim());

    if (enabledKpis.length === 0) {
      setError('Please select at least one KPI with a name');
      return;
    }

    // Validate all enabled KPIs have names
    const invalidKpis = enabledKpis.filter(kpi => !kpi.name.trim());
    if (invalidKpis.length > 0) {
      setError('All selected KPIs must have a name');
      return;
    }

    setIsSubmitting(true);

    try {
      const { fiscalPlanningApi } = await import('@/lib/api');

      const kpisPayload = enabledKpis.map(kpi => ({
        name: kpi.name.trim(),
        target_value: kpi.target_value ? parseFloat(kpi.target_value) : undefined,
        frequency: kpi.frequency,
        unit: kpi.unit.trim() || undefined,
      }));

      await fiscalPlanningApi.createKPIsFromStrategy(strategy.id, { kpis: kpisPayload });

      onSuccess(enabledKpis.length);
      onClose();
    } catch (err: any) {
      console.error('Error creating KPIs:', err);
      setError(err.response?.data?.error || 'Failed to create KPIs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledCount = kpis.filter(kpi => kpi.enabled).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Create KPIs</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              From strategy: <span className="font-medium">{strategy.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Helper buttons */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddNew}
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Add Custom KPI</span>
              </button>
            </div>

            {/* KPIs Table */}
            {kpis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No success metrics available from this strategy.</p>
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Custom KPI
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className={`border rounded-lg p-4 transition-all ${
                      kpi.enabled
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={kpi.enabled}
                        onChange={() => handleToggle(kpi.id)}
                        className="mt-1 h-5 w-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                      />

                      {/* Form fields */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* KPI Name */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            KPI Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={kpi.name}
                            onChange={(e) => handleChange(kpi.id, 'name', e.target.value)}
                            placeholder="e.g., Increase ticket sales by 25%"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            disabled={!kpi.enabled}
                          />
                        </div>

                        {/* Target Value */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Target Value
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={kpi.target_value}
                            onChange={(e) => handleChange(kpi.id, 'target_value', e.target.value)}
                            placeholder="e.g., 5000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            disabled={!kpi.enabled}
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={kpi.unit}
                            onChange={(e) => handleChange(kpi.id, 'unit', e.target.value)}
                            placeholder="e.g., %, $, tickets"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            disabled={!kpi.enabled}
                          />
                        </div>

                        {/* Frequency */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Frequency <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={kpi.frequency}
                            onChange={(e) => handleChange(kpi.id, 'frequency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            disabled={!kpi.enabled}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(kpi.id)}
                        className="mt-6 text-red-600 hover:text-red-700 transition-colors"
                        title="Remove KPI"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {enabledCount} KPI{enabledCount !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || enabledCount === 0}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" />
                      <span>Create Selected KPIs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
