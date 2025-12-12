import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpisApi, kpiCategoriesApi } from '@/lib/api';
import { KPICategory } from '@/types';
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar,
  Lightbulb,
  Save,
  Plus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { formatKPIValue } from '@/lib/formatters';

interface KPIDetailModalProps {
  kpiId: string;
  onClose: () => void;
}

export default function KPIDetailModal({ kpiId, onClose }: KPIDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics' | 'actions'>(
    'overview'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedKPI, setEditedKPI] = useState<any>({});
  const [newHistoryEntry, setNewHistoryEntry] = useState({
    value: '',
    recorded_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [showAddHistory, setShowAddHistory] = useState(false);

  const queryClient = useQueryClient();

  // Fetch KPI details
  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi', kpiId],
    queryFn: () => kpisApi.getById(kpiId).then((res) => res.data),
  });

  // Fetch KPI history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['kpi-history', kpiId],
    queryFn: () => kpisApi.getHistory(kpiId).then((res) => res.data),
  });

  // Fetch KPI forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['kpi-forecast', kpiId],
    queryFn: () => kpisApi.getForecast(kpiId, 6).then((res) => res.data),
  });

  // Fetch KPI actions
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ['kpi-actions', kpiId],
    queryFn: () => kpisApi.getActions(kpiId).then((res) => res.data),
    enabled: activeTab === 'actions',
  });

  // Fetch categories for selector
  const { data: categories } = useQuery<KPICategory[]>({
    queryKey: ['kpi-categories'],
    queryFn: () => kpiCategoriesApi.getAll().then((res) => res.data),
  });

  // Update KPI mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => kpisApi.update(kpiId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error('Failed to update KPI:', error);
      alert(`Failed to save changes: ${error.response?.data?.error || error.message}`);
    },
  });

  // Add history mutation
  const addHistoryMutation = useMutation({
    mutationFn: (data: any) => kpisApi.addHistory(kpiId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-history', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-forecast', kpiId] });
      setShowAddHistory(false);
      setNewHistoryEntry({
        value: '',
        recorded_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
    onError: (error: any) => {
      console.error('Failed to add KPI history:', error);
      alert(`Failed to add entry: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleUpdate = () => {
    console.log('handleUpdate called with:', editedKPI);
    updateMutation.mutate(editedKPI);
  };

  const handleAddHistory = () => {
    console.log('handleAddHistory called', newHistoryEntry);
    if (newHistoryEntry.value && newHistoryEntry.recorded_date) {
      const payload = {
        value: parseFloat(newHistoryEntry.value),
        recorded_date: newHistoryEntry.recorded_date,
        notes: newHistoryEntry.notes,
      };
      console.log('Submitting KPI history:', payload);
      addHistoryMutation.mutate(payload);
    } else {
      console.warn('Missing required fields:', {
        value: newHistoryEntry.value,
        recorded_date: newHistoryEntry.recorded_date,
      });
      alert('Please fill in both Value and Date fields');
    }
  };

  const startEditing = () => {
    setEditedKPI({
      name: kpi.name,
      description: kpi.description,
      target_value: kpi.target_value,
      current_value: kpi.current_value,
      unit: kpi.unit,
      frequency: kpi.frequency,
      status: kpi.status,
      ownership: kpi.ownership || '',
      persons_responsible: kpi.persons_responsible || [],
      category_id: kpi.category_id || '',
    });
    setIsEditing(true);
  };

  if (kpiLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Loading KPI details...</p>
        </div>
      </div>
    );
  }

  if (!kpi) return null;

  // Prepare chart data
  const historyChartData =
    history?.map((h: any) => ({
      date: format(new Date(h.recorded_date), 'MMM dd'),
      value: parseFloat(h.value),
      target: kpi.target_value,
    })) || [];

  const forecastChartData = [
    ...historyChartData,
    ...(forecast?.forecast?.map((f: any) => ({
      date: format(new Date(f.date), 'MMM dd'),
      predicted: f.predicted_value,
      upper: f.confidence_interval.upper,
      lower: f.confidence_interval.lower,
      target: kpi.target_value,
    })) || []),
  ];

  const getTrendIcon = () => {
    if (forecast?.trend === 'increasing') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (forecast?.trend === 'decreasing') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Activity className="h-5 w-5 text-gray-600" />;
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedKPI.name}
                onChange={(e) => setEditedKPI({ ...editedKPI, name: e.target.value })}
                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-900">{kpi.name}</h2>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-gray-600 capitalize">
                Frequency: {kpi.frequency}
              </span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  kpi.status === 'on_track'
                    ? 'bg-green-100 text-green-800'
                    : kpi.status === 'at_risk'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {kpi.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            {(['overview', 'history', 'analytics', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Current Value</p>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editedKPI.current_value || ''}
                            onChange={(e) =>
                              setEditedKPI({ ...editedKPI, current_value: e.target.value })
                            }
                            className="text-2xl font-bold text-gray-900 border-b border-blue-500 w-20"
                          />
                          <input
                            type="text"
                            value={editedKPI.unit || ''}
                            onChange={(e) =>
                              setEditedKPI({ ...editedKPI, unit: e.target.value })
                            }
                            className="text-lg text-gray-600 border-b border-blue-500 w-16"
                          />
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatKPIValue(kpi.current_value, kpi.unit)}
                        </p>
                      )}
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Target Value</p>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedKPI.target_value || ''}
                          onChange={(e) =>
                            setEditedKPI({ ...editedKPI, target_value: e.target.value })
                          }
                          className="text-2xl font-bold text-gray-900 border-b border-blue-500 w-24"
                        />
                      ) : (
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatKPIValue(kpi.target_value, kpi.unit)}
                        </p>
                      )}
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {kpi.target_value && kpi.current_value
                          ? Math.round((kpi.current_value / kpi.target_value) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                    {getTrendIcon()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editedKPI.description || ''}
                    onChange={(e) => setEditedKPI({ ...editedKPI, description: e.target.value })}
                    className="w-full input"
                    rows={3}
                  />
                ) : (
                  <div className="text-gray-700">
                    {kpi.description ? (
                      (() => {
                        // Parse description by multiple delimiters: pipes, newlines, or bullet points
                        const items = kpi.description
                          .split(/\s*\|\s*|\n+|•\s*/)
                          .map((item: string) => item.trim())
                          .filter((item: string) => item.length > 0);

                        // If only one item or no delimiters found, display as plain text
                        if (items.length === 1) {
                          return <p>{kpi.description}</p>;
                        }

                        // Display each item in its own row
                        return (
                          <div className="space-y-2">
                            {items.map((item: string, idx: number) => (
                              <div key={idx} className="flex items-start">
                                <span className="text-blue-500 mr-2 mt-1">•</span>
                                <p className="flex-1">{item}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-gray-500 italic">No description available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Category & Metadata */}
              {isEditing && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Category</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KPI Category
                    </label>
                    <select
                      value={editedKPI.category_id || ''}
                      onChange={(e) =>
                        setEditedKPI({ ...editedKPI, category_id: e.target.value || null })
                      }
                      className="w-full input"
                    >
                      <option value="">Uncategorized</option>
                      {categories?.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Assign this KPI to a category for better organization
                    </p>
                  </div>
                </div>
              )}

              {/* Ownership & Team */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ownership & Team</h3>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ownership (Primary)
                      </label>
                      <input
                        type="text"
                        value={editedKPI.ownership || ''}
                        onChange={(e) => setEditedKPI({ ...editedKPI, ownership: e.target.value })}
                        className="w-full input"
                        placeholder="Primary person responsible"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Persons Responsible (Secondary)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(editedKPI.persons_responsible) ? editedKPI.persons_responsible.join(', ') : ''}
                        onChange={(e) =>
                          setEditedKPI({
                            ...editedKPI,
                            persons_responsible: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full input"
                        placeholder="Enter names separated by commas"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate multiple names with commas</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kpi.ownership && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Primary Owner:</span>
                        <p className="text-gray-900 mt-1">{kpi.ownership}</p>
                      </div>
                    )}
                    {kpi.persons_responsible && kpi.persons_responsible.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Team Members:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {kpi.persons_responsible.map((person: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!kpi.ownership && (!kpi.persons_responsible || kpi.persons_responsible.length === 0) && (
                      <p className="text-gray-500 text-sm">No ownership information available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Trend Chart */}
              {historyChartData.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        name="Target"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary"
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                      className="btn btn-primary flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button onClick={startEditing} className="btn btn-primary">
                    Edit KPI
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Value History</h3>
                <button
                  onClick={() => setShowAddHistory(!showAddHistory)}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </button>
              </div>

              {/* Add History Form */}
              {showAddHistory && (
                <div className="card bg-blue-50">
                  <h4 className="font-semibold text-gray-900 mb-3">Add New Entry</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        value={newHistoryEntry.value}
                        onChange={(e) =>
                          setNewHistoryEntry({ ...newHistoryEntry, value: e.target.value })
                        }
                        className="input"
                        placeholder={`Enter value in ${kpi.unit}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newHistoryEntry.recorded_date}
                        onChange={(e) =>
                          setNewHistoryEntry({ ...newHistoryEntry, recorded_date: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={newHistoryEntry.notes}
                        onChange={(e) =>
                          setNewHistoryEntry({ ...newHistoryEntry, notes: e.target.value })
                        }
                        className="input"
                        placeholder="Add notes"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowAddHistory(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddHistory}
                      disabled={addHistoryMutation.isPending}
                      className="btn btn-primary"
                    >
                      {addHistoryMutation.isPending ? 'Adding...' : 'Add Entry'}
                    </button>
                  </div>
                </div>
              )}

              {/* History Table */}
              {historyLoading ? (
                <p className="text-gray-600">Loading history...</p>
              ) : history && history.length > 0 ? (
                <div className="card overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((entry: any) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(entry.recorded_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatKPIValue(entry.value, kpi.unit)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{entry.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No history entries yet. Add your first entry!</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {forecastLoading ? (
                <p className="text-gray-600">Loading analytics...</p>
              ) : forecast && forecast.forecast && forecast.forecast.length > 0 ? (
                <>
                  {/* Forecast Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <p className="text-sm text-gray-600">Trend</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getTrendIcon()}
                        <span className="text-lg font-semibold capitalize">
                          {forecast.trend}
                        </span>
                      </div>
                    </div>
                    <div className="card">
                      <p className="text-sm text-gray-600">Confidence Level</p>
                      <p className="text-lg font-semibold mt-2 capitalize">{forecast.confidence}</p>
                    </div>
                    <div className="card">
                      <p className="text-sm text-gray-600">On Track</p>
                      <p
                        className={`text-lg font-semibold mt-2 ${
                          forecast.on_track ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {forecast.on_track !== null
                          ? forecast.on_track
                            ? 'Yes'
                            : 'No'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Forecast & Projection
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={forecastChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stackId="1"
                          stroke="#93c5fd"
                          fill="#dbeafe"
                          name="Upper Bound"
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stackId="2"
                          stroke="#3b82f6"
                          fill="#60a5fa"
                          name="Predicted"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stackId="3"
                          stroke="#93c5fd"
                          fill="#dbeafe"
                          name="Lower Bound"
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Actual"
                        />
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          name="Target"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="card text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {forecast?.message || 'Add more historical data to generate forecasts'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              {actionsLoading ? (
                <p className="text-gray-600">Loading AI recommendations...</p>
              ) : actions && actions.actions && actions.actions.length > 0 ? (
                <>
                  {/* Insights */}
                  {actions.insights && (
                    <div className="card bg-blue-50 border-blue-200">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">AI Insights</h3>
                          <p className="text-gray-700">{actions.insights}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recommended Actions
                    </h3>
                    <div className="space-y-4">
                      {actions.actions.map((action: any, index: number) => (
                        <div
                          key={index}
                          className={`card border-l-4 ${
                            action.priority === 'high'
                              ? 'border-l-red-500'
                              : action.priority === 'medium'
                              ? 'border-l-yellow-500'
                              : 'border-l-blue-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{action.title}</h4>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                priorityColors[action.priority as keyof typeof priorityColors]
                              }`}
                            >
                              {action.priority}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{action.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Impact:</span>
                              <span className="ml-2 text-gray-900">{action.expected_impact}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Timeframe:</span>
                              <span className="ml-2 text-gray-900">{action.timeframe}</span>
                            </div>
                            {action.category && (
                              <div>
                                <span className="font-medium text-gray-600">Category:</span>
                                <span className="ml-2 text-gray-900 capitalize">
                                  {action.category}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {actions.risk_factors && actions.risk_factors.length > 0 && (
                    <div className="card bg-yellow-50 border-yellow-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Risk Factors to Watch</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {actions.risk_factors.map((risk: string, index: number) => (
                          <li key={index} className="text-gray-700">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="card text-center py-8">
                  <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {actions?.insights ||
                      'AI recommendations will appear here once enough data is available'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
