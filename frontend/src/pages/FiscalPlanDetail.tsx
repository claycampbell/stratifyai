import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Target, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { fiscalPlanningApi } from '../lib/api';
import { FiscalPlanSummary } from '../types';

export default function FiscalPlanDetail() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<FiscalPlanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fiscalPlanningApi.getPlanSummary(planId);
      setPlan(response.data);
    } catch (err: any) {
      console.error('Error loading plan:', err);
      setError('Failed to load fiscal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStrategies = () => {
    navigate('/ai-strategy');
  };

  const handleActivatePlan = async () => {
    if (!plan) return;

    try {
      setLoading(true);
      await fiscalPlanningApi.activatePlan(plan.plan.id);
      await loadPlan();
      alert(`${plan.plan.fiscal_year} plan has been activated!`);
    } catch (err: any) {
      console.error('Error activating plan:', err);
      alert(err.response?.data?.error || 'Failed to activate plan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/fiscal-planning')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Plans</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Plan not found'}</p>
        </div>
      </div>
    );
  }

  const totalStrategies = Object.values(plan.draft_strategies_count).reduce((a, b) => a + b, 0);
  const completionPercentage = totalStrategies > 0
    ? Math.round((plan.converted_count / totalStrategies) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/fiscal-planning')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{plan.plan.fiscal_year} Strategic Plan</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.plan.status)}`}>
                {plan.plan.status.charAt(0).toUpperCase() + plan.plan.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              {plan.plan.start_date && plan.plan.end_date && (
                <>
                  {new Date(plan.plan.start_date).toLocaleDateString()} - {new Date(plan.plan.end_date).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {plan.plan.status === 'draft' && (
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
            onClick={handleGenerateStrategies}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <Sparkles className="h-5 w-5" />
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

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalStrategies}</div>
              <div className="text-sm text-gray-600 mt-1">Total Strategies</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{plan.draft_strategies_count.draft}</div>
              <div className="text-sm text-gray-600 mt-1">Draft</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{plan.draft_strategies_count.under_review}</div>
              <div className="text-sm text-gray-600 mt-1">Under Review</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{plan.draft_strategies_count.approved}</div>
              <div className="text-sm text-gray-600 mt-1">Approved</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{plan.kpis_created_count}</div>
              <div className="text-sm text-gray-600 mt-1">KPIs Created</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Priorities */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Priorities</h2>
        <div className="space-y-4">
          {plan.priorities.map((priority) => (
            <div
              key={priority.id}
              className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {priority.priority_number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{priority.title}</h3>
                    {priority.description && (
                      <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>{priority.strategy_count} strategies</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleGenerateStrategies}>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Generate AI Strategies</h3>
              <p className="text-sm text-gray-600">
                Use AI to create data-driven strategies for your priorities with implementation plans and KPIs
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Review Strategies</h3>
              <p className="text-sm text-gray-600">
                Review and approve generated strategies before converting them to formal OGSM components
              </p>
              <p className="text-xs text-gray-500 mt-2">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
