import React, { useState, useEffect } from 'react';
import {
  risksApi,
  initiativesApi,
  scenariosApi,
  budgetsApi,
  resourcesApi,
  dependenciesApi,
} from '../lib/api';
import {
  Risk,
  Initiative,
  Scenario,
  Budget,
  Resource,
  Dependency,
} from '../types';

type TabType = 'risks' | 'initiatives' | 'scenarios' | 'budgets' | 'resources' | 'dependencies';

const StrategicPlanning: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('risks');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [risks, setRisks] = useState<Risk[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  // Stats states
  const [riskStats, setRiskStats] = useState<any>(null);
  const [initiativeStats, setInitiativeStats] = useState<any>(null);
  const [budgetStats, setBudgetStats] = useState<any>(null);
  const [resourceStats, setResourceStats] = useState<any>(null);
  const [dependencyStats, setDependencyStats] = useState<any>(null);

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'risks':
          const [risksRes, riskStatsRes] = await Promise.all([
            risksApi.getAll({ sort_by: 'risk_score', sort_order: 'desc' }),
            risksApi.getStats(),
          ]);
          setRisks(risksRes.data);
          setRiskStats(riskStatsRes.data);
          break;

        case 'initiatives':
          const [initiativesRes, initiativeStatsRes] = await Promise.all([
            initiativesApi.getAll({ sort_by: 'created_at', sort_order: 'desc' }),
            initiativesApi.getStats(),
          ]);
          setInitiatives(initiativesRes.data);
          setInitiativeStats(initiativeStatsRes.data);
          break;

        case 'scenarios':
          const scenariosRes = await scenariosApi.getAll();
          setScenarios(scenariosRes.data);
          break;

        case 'budgets':
          const [budgetsRes, budgetStatsRes] = await Promise.all([
            budgetsApi.getAll({ sort_by: 'created_at', sort_order: 'desc' }),
            budgetsApi.getStats(),
          ]);
          setBudgets(budgetsRes.data);
          setBudgetStats(budgetStatsRes.data);
          break;

        case 'resources':
          const [resourcesRes, resourceStatsRes] = await Promise.all([
            resourcesApi.getAll({ sort_by: 'resource_name', sort_order: 'asc' }),
            resourcesApi.getStats(),
          ]);
          setResources(resourcesRes.data);
          setResourceStats(resourceStatsRes.data);
          break;

        case 'dependencies':
          const [dependenciesRes, dependencyStatsRes] = await Promise.all([
            dependenciesApi.getAll(),
            dependenciesApi.getStats(),
          ]);
          setDependencies(dependenciesRes.data);
          setDependencyStats(dependencyStatsRes.data);
          break;
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'risks', label: 'Risk Register', icon: '⚠️' },
    { id: 'initiatives', label: 'Initiatives', icon: '🚀' },
    { id: 'scenarios', label: 'Scenarios', icon: '🔮' },
    { id: 'budgets', label: 'Budgets', icon: '💰' },
    { id: 'resources', label: 'Resources', icon: '👥' },
    { id: 'dependencies', label: 'Dependencies', icon: '🔗' },
  ] as const;

  const getRiskColor = (score: number) => {
    if (score >= 16) return 'bg-red-100 border-red-300 text-red-800';
    if (score >= 9) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (score >= 4) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      on_track: 'bg-green-100 text-green-800',
      at_risk: 'bg-yellow-100 text-yellow-800',
      off_track: 'bg-red-100 text-red-800',
      planning: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      available: 'bg-green-100 text-green-800',
      fully_allocated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Strategic Planning Tools</h1>
        <p className="mt-2 text-gray-600">
          Manage risks, initiatives, scenarios, budgets, resources, and dependencies for strategic execution
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div>
          {/* RISK REGISTER TAB */}
          {activeTab === 'risks' && (
            <div>
              {/* Risk Stats */}
              {riskStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Risks</div>
                    <div className="text-2xl font-bold">{riskStats.summary.total_risks}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                    <div className="text-sm text-red-600">Critical Risks</div>
                    <div className="text-2xl font-bold text-red-800">{riskStats.summary.critical_count}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
                    <div className="text-sm text-orange-600">High Risks</div>
                    <div className="text-2xl font-bold text-orange-800">{riskStats.summary.high_count}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                    <div className="text-sm text-blue-600">Avg Risk Score</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {parseFloat(riskStats.summary.average_risk_score || 0).toFixed(1)}
                    </div>
                  </div>
                </div>
              )}

              {/* Risks Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Likelihood</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {risks.map((risk) => (
                      <tr key={risk.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                          {risk.description && <div className="text-sm text-gray-500 truncate max-w-xs">{risk.description}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{risk.category || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm capitalize">{risk.likelihood.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-sm capitalize">{risk.impact.replace('_', ' ')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${getRiskColor(risk.risk_score || 0)}`}>
                            {risk.risk_score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(risk.status)}`}>
                            {risk.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{risk.owner_email || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {risks.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No risks found. Create your first risk to get started.</div>
                )}
              </div>
            </div>
          )}

          {/* INITIATIVES TAB */}
          {activeTab === 'initiatives' && (
            <div>
              {/* Initiative Stats */}
              {initiativeStats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Initiatives</div>
                    <div className="text-2xl font-bold">{initiativeStats.total_initiatives}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                    <div className="text-sm text-blue-600">In Progress</div>
                    <div className="text-2xl font-bold text-blue-800">{initiativeStats.in_progress_count}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                    <div className="text-sm text-green-600">Completed</div>
                    <div className="text-2xl font-bold text-green-800">{initiativeStats.completed_count}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
                    <div className="text-sm text-purple-600">Avg Completion</div>
                    <div className="text-2xl font-bold text-purple-800">
                      {parseFloat(initiativeStats.avg_completion || 0).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg shadow border border-emerald-200">
                    <div className="text-sm text-emerald-600">Total Budget</div>
                    <div className="text-2xl font-bold text-emerald-800">
                      {formatCurrency(initiativeStats.total_budget_allocated || 0)}
                    </div>
                  </div>
                </div>
              )}

              {/* Initiatives Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initiatives.map((initiative) => (
                  <div key={initiative.id} className="bg-white p-6 rounded-lg shadow border hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{initiative.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(initiative.status)}`}>
                        {initiative.status}
                      </span>
                    </div>
                    {initiative.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{initiative.description}</p>}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Priority:</span>
                        <span className="font-medium capitalize">{initiative.priority}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progress:</span>
                        <span className="font-medium">{initiative.completion_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${initiative.completion_percentage}%` }}
                        />
                      </div>
                      {initiative.budget_allocated && (
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="text-gray-500">Budget:</span>
                          <span className="font-medium">{formatCurrency(initiative.budget_allocated)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {initiatives.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                  No initiatives found. Create your first initiative to get started.
                </div>
              )}
            </div>
          )}

          {/* SCENARIOS TAB */}
          {activeTab === 'scenarios' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="bg-white p-6 rounded-lg shadow border hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
                      {scenario.is_baseline && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Baseline</span>
                      )}
                    </div>
                    {scenario.description && <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium capitalize">{scenario.scenario_type.replace('_', ' ')}</span>
                      </div>
                      {scenario.probability !== null && scenario.probability !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Probability:</span>
                          <span className="font-medium">{((scenario.probability ?? 0) * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(scenario.status)}`}>
                          {scenario.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {scenarios.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                  No scenarios found. Create your first scenario to run what-if analysis.
                </div>
              )}
            </div>
          )}

          {/* BUDGETS TAB */}
          {activeTab === 'budgets' && (
            <div>
              {/* Budget Stats */}
              {budgetStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                    <div className="text-sm text-blue-600">Total Allocated</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(budgetStats.summary.total_allocated || 0)}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                    <div className="text-sm text-red-600">Total Spent</div>
                    <div className="text-2xl font-bold text-red-800">{formatCurrency(budgetStats.summary.total_spent || 0)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                    <div className="text-sm text-green-600">Remaining</div>
                    <div className="text-2xl font-bold text-green-800">{formatCurrency(budgetStats.summary.total_remaining || 0)}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
                    <div className="text-sm text-purple-600">Active Budgets</div>
                    <div className="text-2xl font-bold text-purple-800">{budgetStats.summary.active_count}</div>
                  </div>
                </div>
              )}

              {/* Budgets Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {budgets.map((budget) => (
                      <tr key={budget.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{budget.budget_name}</div>
                          {budget.fiscal_year && (
                            <div className="text-sm text-gray-500">
                              FY{budget.fiscal_year}
                              {budget.fiscal_quarter && ` Q${budget.fiscal_quarter}`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm capitalize">{budget.budget_type.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-sm font-medium">{formatCurrency(budget.allocated_amount)}</td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(budget.spent_amount)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">{formatCurrency(budget.remaining_amount || 0)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={budget.variance_amount && budget.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                            {budget.variance_percentage ? `${budget.variance_percentage.toFixed(1)}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(budget.status)}`}>
                            {budget.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {budgets.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No budgets found. Create your first budget to track spending.</div>
                )}
              </div>
            </div>
          )}

          {/* RESOURCES TAB */}
          {activeTab === 'resources' && (
            <div>
              {/* Resource Stats */}
              {resourceStats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Resources</div>
                    <div className="text-2xl font-bold">{resourceStats.summary.total_resources}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                    <div className="text-sm text-green-600">Available</div>
                    <div className="text-2xl font-bold text-green-800">{resourceStats.summary.available_count}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
                    <div className="text-sm text-yellow-600">Partially Allocated</div>
                    <div className="text-2xl font-bold text-yellow-800">{resourceStats.summary.partially_allocated_count}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                    <div className="text-sm text-red-600">Fully Allocated</div>
                    <div className="text-2xl font-bold text-red-800">{resourceStats.summary.fully_allocated_count}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                    <div className="text-sm text-blue-600">Avg Allocation</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {parseFloat(resourceStats.summary.avg_allocation_percentage || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Resources Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Hour</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {resources.map((resource) => (
                      <tr key={resource.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{resource.resource_name}</div>
                          {resource.email && <div className="text-sm text-gray-500">{resource.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm capitalize">{resource.resource_type.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-sm">{resource.department || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                resource.total_allocation_percentage >= 100
                                  ? 'bg-red-600'
                                  : resource.total_allocation_percentage >= 75
                                  ? 'bg-yellow-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(resource.total_allocation_percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{resource.total_allocation_percentage.toFixed(0)}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(resource.availability_status)}`}>
                            {resource.availability_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {resource.cost_per_hour ? formatCurrency(resource.cost_per_hour) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resources.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No resources found. Create your first resource to manage allocation.</div>
                )}
              </div>
            </div>
          )}

          {/* DEPENDENCIES TAB */}
          {activeTab === 'dependencies' && (
            <div>
              {/* Dependency Stats */}
              {dependencyStats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Dependencies</div>
                    <div className="text-2xl font-bold">{dependencyStats.summary.total_dependencies}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                    <div className="text-sm text-blue-600">Active</div>
                    <div className="text-2xl font-bold text-blue-800">{dependencyStats.summary.active_count}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                    <div className="text-sm text-red-600">Critical</div>
                    <div className="text-2xl font-bold text-red-800">{dependencyStats.summary.critical_count}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
                    <div className="text-sm text-orange-600">Blocks</div>
                    <div className="text-2xl font-bold text-orange-800">{dependencyStats.summary.blocks_count}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                    <div className="text-sm text-green-600">Resolved</div>
                    <div className="text-2xl font-bold text-green-800">{dependencyStats.summary.resolved_count}</div>
                  </div>
                </div>
              )}

              {/* Dependencies Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dependencies.map((dep) => (
                      <tr key={dep.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{dep.source_type}</div>
                          <div className="text-xs text-gray-500">{dep.source_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{dep.target_type}</div>
                          <div className="text-xs text-gray-500">{dep.target_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 text-sm capitalize">{dep.dependency_type.replace('_', ' ')}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              dep.strength === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : dep.strength === 'strong'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {dep.strength || 'medium'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(dep.status)}`}>{dep.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{dep.description || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dependencies.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No dependencies found. Create dependencies to track relationships between entities.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategicPlanning;
