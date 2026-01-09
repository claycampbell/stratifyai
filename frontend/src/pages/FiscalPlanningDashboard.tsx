import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, CheckCircle, AlertCircle, Plus, Calendar, Edit } from 'lucide-react';
import { fiscalPlanningApi } from '../lib/api';
import { FiscalPlanSummary } from '../types';

export default function FiscalPlanningDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<FiscalPlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllPlans();
  }, []);

  const loadAllPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all plans
      const allPlansResponse = await fiscalPlanningApi.getAllPlans();

      if (allPlansResponse.data && allPlansResponse.data.length > 0) {
        // Load summary for each plan
        const planSummaries = await Promise.all(
          allPlansResponse.data.map(async (plan: any) => {
            const summaryResponse = await fiscalPlanningApi.getPlanSummary(plan.id);
            return summaryResponse.data;
          })
        );
        setPlans(planSummaries);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      console.error('Error loading fiscal plans:', err);
      setError('Failed to load fiscal planning data');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewPlan = () => {
    navigate('/fiscal-planning/setup/new');
  };

  const handleViewPlan = (planId: string) => {
    navigate(`/fiscal-planning/plan/${planId}`);
  };

  const handleActivatePlan = async (plan: FiscalPlanSummary) => {
    try {
      setLoading(true);
      await fiscalPlanningApi.activatePlan(plan.plan.id);
      // Reload all plans to show updated status
      await loadAllPlans();
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

  // No plans - show getting started
  if (plans.length === 0) {
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

  // Plans exist - show list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fiscal Year Planning</h1>
          <p className="text-gray-600 mt-2">
            Manage your fiscal year strategic plans
          </p>
        </div>

        <button
          onClick={handleCreateNewPlan}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Fiscal Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((planSummary) => {
          const totalStrategies = Object.values(planSummary.draft_strategies_count).reduce((a, b) => a + b, 0);
          const completionPercentage = totalStrategies > 0
            ? Math.round((planSummary.converted_count / totalStrategies) * 100)
            : 0;

          return (
            <div
              key={planSummary.plan.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewPlan(planSummary.plan.id)}
            >
              {/* Plan Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{planSummary.plan.fiscal_year}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(planSummary.plan.status)}`}>
                      {planSummary.plan.status.charAt(0).toUpperCase() + planSummary.plan.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              {planSummary.plan.start_date && planSummary.plan.end_date && (
                <p className="text-sm text-gray-600 mb-4">
                  {new Date(planSummary.plan.start_date).toLocaleDateString()} - {new Date(planSummary.plan.end_date).toLocaleDateString()}
                </p>
              )}

              {/* Priorities */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Priorities ({planSummary.priorities.length}/3)</h4>
                <div className="space-y-1">
                  {planSummary.priorities.map((priority) => (
                    <div key={priority.id} className="flex items-center space-x-2 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {priority.priority_number}
                      </div>
                      <span className="text-gray-700 truncate">{priority.title}</span>
                      <span className="text-gray-500 text-xs">({priority.strategy_count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {totalStrategies > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">{totalStrategies}</div>
                  <div className="text-xs text-gray-600">Strategies</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-green-600">{planSummary.draft_strategies_count.approved}</div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{planSummary.kpis_created_count}</div>
                  <div className="text-xs text-gray-600">KPIs</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewPlan(planSummary.plan.id);
                  }}
                  className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                {planSummary.plan.status === 'draft' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivatePlan(planSummary);
                    }}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Activate</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
