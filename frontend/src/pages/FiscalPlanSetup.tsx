import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Target, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { fiscalPlanningApi } from '../lib/api';
import { FiscalYearPlanWithRelations, FiscalYearDraftStrategy } from '../types';

interface PriorityForm {
  priority_number: 1 | 2 | 3;
  title: string;
  description: string;
}

export default function FiscalPlanSetup() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [step, setStep] = useState(planId ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Fiscal Year Info
  const [fiscalYear, setFiscalYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2: Priorities
  const [priorities, setPriorities] = useState<PriorityForm[]>([
    { priority_number: 1, title: '', description: '' },
    { priority_number: 2, title: '', description: '' },
    { priority_number: 3, title: '', description: '' },
  ]);

  const [createdPlanId, setCreatedPlanId] = useState<string | null>(planId || null);
  const [fullPlan, setFullPlan] = useState<FiscalYearPlanWithRelations | null>(null);

  useEffect(() => {
    if (planId) {
      loadExistingPlan(planId);
    } else {
      // Generate default fiscal year (current year + 1)
      const nextYear = new Date().getFullYear() + 1;
      const fyShort = nextYear.toString().slice(-2);
      setFiscalYear(`FY${fyShort}`);

      // Default dates (July 1 to June 30 next year)
      const defaultStart = `${nextYear - 1}-07-01`;
      const defaultEnd = `${nextYear}-06-30`;
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  }, [planId]);

  const loadExistingPlan = async (id: string) => {
    try {
      setLoading(true);
      const response = await fiscalPlanningApi.getPlanById(id);
      const plan = response.data;
      setFullPlan(plan);
      setFiscalYear(plan.fiscal_year);
      
      if (plan.priorities && plan.priorities.length > 0) {
        const newPriorities = [
          { priority_number: 1, title: '', description: '' },
          { priority_number: 2, title: '', description: '' },
          { priority_number: 3, title: '', description: '' },
        ] as PriorityForm[];
        
        plan.priorities.forEach((p: any) => {
          const idx = p.priority_number - 1;
          if (idx >= 0 && idx < 3) {
            newPriorities[idx] = {
              priority_number: p.priority_number,
              title: p.title,
              description: p.description || '',
            };
          }
        });
        setPriorities(newPriorities);
      }
    } catch (err) {
      console.error('Error loading plan:', err);
      setError('Failed to load existing plan');
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = (index: number, field: 'title' | 'description', value: string) => {
    const newPriorities = [...priorities];
    newPriorities[index] = {
      ...newPriorities[index],
      [field]: value,
    };
    setPriorities(newPriorities);
  };

  const handleCreatePlan = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create the fiscal plan
      const planResponse = await fiscalPlanningApi.createPlan({
        fiscal_year: fiscalYear,
        start_date: startDate,
        end_date: endDate,
      });

      setCreatedPlanId(planResponse.data.id);
      setStep(2);
    } catch (err: any) {
      console.error('Error creating plan:', err);
      if (err.response?.status === 409) {
        setError('A plan for this fiscal year already exists');
      } else {
        setError('Failed to create fiscal plan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePriorities = async () => {
    if (!createdPlanId) return;

    // Validate priorities
    const filledPriorities = priorities.filter(p => p.title.trim() !== '');
    if (filledPriorities.length === 0) {
      setError('Please enter at least one priority');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await fiscalPlanningApi.updatePriorities(createdPlanId, {
        priorities: filledPriorities.map(p => ({
          priority_number: p.priority_number,
          title: p.title,
          description: p.description || undefined,
        })),
      });

      // Navigate to the plan dashboard
      navigate(`/fiscal-planning`);
    } catch (err: any) {
      console.error('Error saving priorities:', err);
      setError('Failed to save priorities');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (strategyId: string, status: 'approved' | 'rejected') => {
    try {
      await fiscalPlanningApi.updateStrategyStatus(strategyId, { status });
      if (createdPlanId) loadExistingPlan(createdPlanId);
    } catch (err) {
      console.error('Error updating strategy status:', err);
      alert('Failed to update strategy status');
    }
  };

  const canProceedStep1 = fiscalYear && startDate && endDate;
  const filledPrioritiesCount = priorities.filter(p => p.title.trim() !== '').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {planId ? `Review ${fiscalYear} Plan` : 'Create Fiscal Year Plan'}
          </h1>
          <p className="text-gray-600 mt-2">
            {planId 
              ? 'Review and approve generated strategies for your priorities'
              : 'Set up your strategic planning cycle for the upcoming fiscal year'}
          </p>
        </div>
        {planId && (
          <button
            onClick={() => navigate(`/fiscal-planning/plan/${planId}`)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Detail</span>
          </button>
        )}
      </div>

      {/* Progress Stepper - Only show if creating new */}
      {!planId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">Fiscal Year Info</p>
                <p className="text-xs text-gray-600">Set dates and timeframe</p>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-gray-400" />

            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">Define Priorities</p>
                <p className="text-xs text-gray-600">Set 3 core objectives</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Fiscal Year Info */}
      {step === 1 && !planId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fiscal Year Information</h2>
            <p className="text-gray-600 text-sm">
              Define the fiscal year timeframe for your strategic plan
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fiscal Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="FY27"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., FY27, FY28</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/fiscal-planning')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlan}
              disabled={!canProceedStep1 || loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Define Priorities / Review Strategies */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {planId ? 'Core Priorities' : 'Define Core Priorities'}
              </h2>
              <p className="text-gray-600 text-sm">
                {planId 
                  ? `Strategic priorities for ${fiscalYear}`
                  : `Enter up to 3 strategic priorities for ${fiscalYear}. These will be the foundation of your plan.`}
              </p>
            </div>

            <div className="space-y-6">
              {priorities.map((priority, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {priority.priority_number}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority Title {index === 0 && !planId && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={priority.title}
                          onChange={(e) => handlePriorityChange(index, 'title', e.target.value)}
                          disabled={!!planId}
                          placeholder={`e.g., ${
                            index === 0 ? 'Hockey Revenue Growth' :
                            index === 1 ? 'Turf Field Marketing' :
                            'Operational Excellence'
                          }`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={priority.description}
                          onChange={(e) => handlePriorityChange(index, 'description', e.target.value)}
                          disabled={!!planId}
                          placeholder="Brief description of this priority"
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>

                      {/* Show strategies for this priority if planId exists */}
                      {planId && fullPlan && (
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900">Draft Strategies</h4>
                          {fullPlan.priorities.find(p => p.priority_number === priority.priority_number)?.strategies.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No strategies added yet</p>
                          ) : (
                            <div className="space-y-3">
                              {fullPlan.priorities.find(p => p.priority_number === priority.priority_number)?.strategies.map((s: FiscalYearDraftStrategy) => (
                                <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="text-sm font-bold text-gray-900">{s.title}</h5>
                                      <p className="text-xs text-gray-600 mt-1">{s.description}</p>
                                      <div className="flex items-center space-x-2 mt-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                          s.status === 'approved' ? 'bg-green-100 text-green-800' :
                                          s.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {s.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                      {s.status !== 'approved' && (
                                        <button
                                          onClick={() => handleUpdateStatus(s.id, 'approved')}
                                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                                          title="Approve"
                                        >
                                          <CheckCircle className="h-5 w-5" />
                                        </button>
                                      )}
                                      {s.status !== 'rejected' && (
                                        <button
                                          onClick={() => handleUpdateStatus(s.id, 'rejected')}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                                          title="Reject"
                                        >
                                          <Target className="h-5 w-5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!planId && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Priority Examples</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Revenue Growth: Increase ticket sales, sponsorships, or fundraising</li>
                        <li>• Facility Management: Optimize usage, maintenance, or marketing of facilities</li>
                        <li>• Student Success: Improve graduation rates, academic support, or retention</li>
                        <li>• Operational Excellence: Enhance processes, efficiency, or staff development</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleSavePriorities}
                    disabled={filledPrioritiesCount === 0 || loading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete Setup ({filledPrioritiesCount} {filledPrioritiesCount === 1 ? 'priority' : 'priorities'})</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
