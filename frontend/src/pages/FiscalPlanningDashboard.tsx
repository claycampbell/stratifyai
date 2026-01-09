import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, CheckCircle, Clock, AlertCircle, Plus, PlayCircle } from 'lucide-react';
import { fiscalPlanningApi } from '../lib/api';
import { FiscalPlanSummary } from '../types';

export default function FiscalPlanningDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<FiscalPlanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivePlan();
  }, []);

  const loadActivePlan = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get active plan first
      try {
        const planResponse = await fiscalPlanningApi.getActivePlan();
        if (planResponse.data) {
          const summaryResponse = await fiscalPlanningApi.getPlanSummary(planResponse.data.id);
          setActivePlan(summaryResponse.data);
          return;
        }
      } catch (err: any) {
        // No active plan, check for draft plans
        if (err.response?.status === 404) {
          // Try to get the most recent draft plan
          const allPlansResponse = await fiscalPlanningApi.getAllPlans();
          if (allPlansResponse.data && allPlansResponse.data.length > 0) {
            const latestPlan = allPlansResponse.data[0]; // Assuming sorted by created_at DESC
            const summaryResponse = await fiscalPlanningApi.getPlanSummary(latestPlan.id);
            setActivePlan(summaryResponse.data);
            return;
          }
        }
      }

      // No plans found at all
      setActivePlan(null);
    } catch (err: any) {
      console.error('Error loading fiscal plan:', err);
      setError('Failed to load fiscal planning data');
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewPlan = () => {
    navigate('/fiscal-planning/setup/new');
  };

  const handleContinuePlan = () => {
    // Navigate to AI Strategy Generator to create strategies
    navigate('/ai-strategy');
  };

  const handleViewStrategies = () => {
    if (activePlan) {
      navigate(`/fiscal-planning/strategies/${activePlan.plan.id}`);
    }
  };

  const handleActivatePlan = async () => {
    if (!activePlan) return;

    try {
      setLoading(true);
      await fiscalPlanningApi.activatePlan(activePlan.plan.id);
      // Reload the plan to show updated status
      await loadActivePlan();
      alert(`${activePlan.plan.fiscal_year} plan has been activated!`);
    } catch (err: any) {
      console.error('Error activating plan:', err);
      alert(err.response?.data?.error || 'Failed to activate plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // No active plan - show getting started
  if (!activePlan) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fiscal Year Planning</h1>
          <p className="text-gray-600 mt-2">
            Build your strategic plan for the upcoming fiscal year using AI-powered strategy generation
          </p>
        </div>

        {/* Getting Started Card */}
        <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-8">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Target className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Get Started with Fiscal Year Planning</h2>
                <p className="text-gray-600 mt-1">Create a structured strategic plan in minutes</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Pick 3 Core Priorities</h3>
                  <p className="text-gray-600 text-sm">
                    Define the 3 most important objectives for next fiscal year (e.g., Hockey Revenue Growth,
                    Turf Field Marketing, Operational Excellence)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Generate AI Strategies</h3>
                  <p className="text-gray-600 text-sm">
                    Use the AI Strategy Generator to create data-driven strategies for each priority,
                    complete with implementation steps and KPIs
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Convert to OGSM</h3>
                  <p className="text-gray-600 text-sm">
                    Review and approve strategies, then convert them into formal OGSM components with trackable KPIs
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateNewPlan}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Start New Fiscal Year Plan</span>
            </button>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Structured Planning</h3>
            <p className="text-gray-600 text-sm">
              Follow a proven workflow to create comprehensive strategic plans with clear priorities and measurable outcomes
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Strategies</h3>
            <p className="text-gray-600 text-sm">
              Generate evidence-based strategies using AI trained on successful college athletics programs
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="p-3 bg-green-100 rounded-lg w-fit mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Easy Activation</h3>
            <p className="text-gray-600 text-sm">
              Review, refine, and activate your plan with one click to make it your active strategic framework
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active plan exists - show dashboard
  const totalStrategies = Object.values(activePlan.draft_strategies_count).reduce((a, b) => a + b, 0);
  const completionPercentage = totalStrategies > 0
    ? Math.round((activePlan.converted_count / totalStrategies) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">{activePlan.plan.fiscal_year} Strategic Plan</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activePlan.plan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              activePlan.plan.status === 'active' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {activePlan.plan.status.charAt(0).toUpperCase() + activePlan.plan.status.slice(1)}
            </span>
          </div>
          <p className="text-gray-600 mt-2">
            {activePlan.plan.start_date && activePlan.plan.end_date && (
              <>
                {new Date(activePlan.plan.start_date).toLocaleDateString()} - {new Date(activePlan.plan.end_date).toLocaleDateString()}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activePlan.plan.status === 'draft' && (
            <button
              onClick={handleActivatePlan}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Activate Plan</span>
            </button>
          )}
          <button
            onClick={handleContinuePlan}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <PlayCircle className="h-5 w-5" />
            <span>Generate Strategies</span>
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planning Progress</h2>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Completion</span>
              <span className="text-sm font-medium text-gray-900">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-6 w-6 ${activePlan.priorities.length === 3 ? 'text-green-600' : 'text-gray-300'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">Priorities Defined</p>
                <p className="text-xs text-gray-600">{activePlan.priorities.length}/3 priorities</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className={`h-6 w-6 ${totalStrategies > 0 ? 'text-blue-600' : 'text-gray-300'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">Strategies Generated</p>
                <p className="text-xs text-gray-600">{totalStrategies} strategies</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <TrendingUp className={`h-6 w-6 ${activePlan.converted_count > 0 ? 'text-purple-600' : 'text-gray-300'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">Converted to OGSM</p>
                <p className="text-xs text-gray-600">{activePlan.converted_count} converted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Draft</h3>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="h-4 w-4 text-gray-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activePlan.draft_strategies_count.draft}</p>
          <p className="text-xs text-gray-500 mt-1">Strategies in draft</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Under Review</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activePlan.draft_strategies_count.under_review}</p>
          <p className="text-xs text-gray-500 mt-1">Being reviewed</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Approved</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activePlan.draft_strategies_count.approved}</p>
          <p className="text-xs text-gray-500 mt-1">Ready to convert</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">KPIs Created</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activePlan.kpis_created_count}</p>
          <p className="text-xs text-gray-500 mt-1">Performance metrics</p>
        </div>
      </div>

      {/* Priorities */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Priorities</h2>
        <div className="space-y-4">
          {activePlan.priorities.map((priority) => (
            <div key={priority.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {priority.priority_number}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{priority.title}</h3>
                    {priority.description && (
                      <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {priority.strategy_count} {priority.strategy_count === 1 ? 'strategy' : 'strategies'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activePlan.priorities.length < 3 && (
          <button
            onClick={handleContinuePlan}
            className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add More Priorities</span>
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/ai-strategy')}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate Strategies</h3>
                <p className="text-sm text-gray-600">Use AI to create strategies for your priorities</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleViewStrategies}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Review Strategies</h3>
                <p className="text-sm text-gray-600">View and manage your draft strategies</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
