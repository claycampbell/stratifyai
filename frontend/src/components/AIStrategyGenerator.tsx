import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiStrategyApi, fiscalPlanningApi } from '@/lib/api';
import { Sparkles, TrendingUp, AlertTriangle, Target, Clock, DollarSign, CheckCircle, ChevronDown, ChevronUp, Lightbulb, Plus, CalendarCheck, BarChart3, ExternalLink } from 'lucide-react';
import type { StrategyGenerationContext, GeneratedStrategy, StrategyGenerationResponse, FiscalPlanSummary } from '@/types';
import CreateKPIsModal from './CreateKPIsModal';

interface AIStrategyGeneratorProps {
  onStrategyGenerated?: (strategies: GeneratedStrategy[]) => void;
}

export default function AIStrategyGenerator({ onStrategyGenerated }: AIStrategyGeneratorProps) {
  const [formData, setFormData] = useState<StrategyGenerationContext>({
    objective: '',
    industry: '',
    company_size: '',
    current_situation: '',
    constraints: '',
    resources: '',
    timeframe: '',
  });
  const [numStrategies, setNumStrategies] = useState(3);
  const [generatedStrategies, setGeneratedStrategies] = useState<GeneratedStrategy[]>([]);
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);
  const [activeFiscalPlan, setActiveFiscalPlan] = useState<FiscalPlanSummary | null>(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState<number | null>(null);
  const [addingToPlan, setAddingToPlan] = useState<number | null>(null);
  const [addedStrategyIds, setAddedStrategyIds] = useState<Map<number, string>>(new Map());
  const [strategyKPICounts, setStrategyKPICounts] = useState<Map<string, number>>(new Map());
  const [createKPIsModalStrategy, setCreateKPIsModalStrategy] = useState<{ index: number; strategyId: string; strategy: GeneratedStrategy } | null>(null);

  // Check for active fiscal plan on component mount
  useEffect(() => {
    checkActiveFiscalPlan();
  }, []);

  const checkActiveFiscalPlan = async () => {
    try {
      // First try to get active plan
      const activePlanResponse = await fiscalPlanningApi.getActivePlan();
      if (activePlanResponse.data) {
        const summaryResponse = await fiscalPlanningApi.getPlanSummary(activePlanResponse.data.id);
        setActiveFiscalPlan(summaryResponse.data);
        return;
      }
    } catch (err) {
      console.log('No active fiscal plan found');
    }

    try {
      // If no active plan, get the most recent draft plan
      const allPlansResponse = await fiscalPlanningApi.getAllPlans();
      if (allPlansResponse.data && allPlansResponse.data.length > 0) {
        // Get the first plan (most recent, since they're ordered by created_at DESC)
        const mostRecentPlan = allPlansResponse.data[0];
        const summaryResponse = await fiscalPlanningApi.getPlanSummary(mostRecentPlan.id);
        setActiveFiscalPlan(summaryResponse.data);
      }
    } catch (err) {
      console.log('No fiscal plans found');
    }
  };

  const handleAddToPlan = async (strategy: GeneratedStrategy, priorityId: string) => {
    if (!activeFiscalPlan) return;

    const strategyIndex = generatedStrategies.indexOf(strategy);
    setAddingToPlan(strategyIndex);
    setShowPriorityDropdown(null);

    try {
      const response = await fiscalPlanningApi.addStrategy(activeFiscalPlan.plan.id, {
        priority_id: priorityId,
        strategy: {
          title: strategy.title,
          description: strategy.description,
          rationale: strategy.rationale,
          implementation_steps: strategy.implementation_steps,
          success_probability: strategy.success_probability,
          estimated_cost: strategy.estimated_cost,
          timeframe: strategy.timeframe,
          risks: strategy.risks,
          required_resources: strategy.required_resources,
          success_metrics: strategy.success_metrics,
          supporting_evidence: strategy.supporting_evidence,
        },
      });

      // Track the added strategy ID
      const addedStrategy = response.data;
      setAddedStrategyIds(prev => new Map(prev).set(strategyIndex, addedStrategy.id));

      // Fetch initial KPI count
      try {
        const countResponse = await fiscalPlanningApi.getStrategyKPIsCount(addedStrategy.id);
        setStrategyKPICounts(prev => new Map(prev).set(addedStrategy.id, countResponse.data.count));
      } catch (countErr) {
        console.error('Error fetching KPI count:', countErr);
      }

      // Show success message
      alert(`Strategy added to ${activeFiscalPlan.plan.fiscal_year} plan!`);
    } catch (err: any) {
      console.error('Error adding strategy to plan:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add strategy to plan';
      alert(`Failed to add strategy to plan: ${errorMessage}`);
    } finally {
      setAddingToPlan(null);
    }
  };

  const generateMutation = useMutation({
    mutationFn: (context: StrategyGenerationContext & { num_strategies: number }) =>
      aiStrategyApi.generate(context),
    onSuccess: (response) => {
      const data = response.data as StrategyGenerationResponse;
      setGeneratedStrategies(data.strategies);
      if (onStrategyGenerated) {
        onStrategyGenerated(data.strategies);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.objective.trim()) {
      alert('Please enter your objective');
      return;
    }
    generateMutation.mutate({ ...formData, num_strategies: numStrategies });
  };

  const handleInputChange = (field: keyof StrategyGenerationContext, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenCreateKPIsModal = (index: number, strategyId: string, strategy: GeneratedStrategy) => {
    setCreateKPIsModalStrategy({ index, strategyId, strategy });
  };

  const handleKPIsCreated = async (kpisCount: number) => {
    if (!createKPIsModalStrategy) return;

    // Update KPI count
    setStrategyKPICounts(prev => new Map(prev).set(createKPIsModalStrategy.strategyId, kpisCount));

    // Show success message
    alert(`Successfully created ${kpisCount} KPI${kpisCount !== 1 ? 's' : ''} from strategy!`);

    // Close modal
    setCreateKPIsModalStrategy(null);
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'text-green-600';
    if (prob >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Sparkles className="h-7 w-7 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Strategy Generator</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generate data-driven strategies for college athletics using AI and proven successful approaches
          </p>
        </div>
      </div>

      {/* Fiscal Plan Banner */}
      {activeFiscalPlan && (
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 border-2 border-primary-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900">
                🎯 Building {activeFiscalPlan.plan.fiscal_year} Plan
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add strategies to your plan, then create KPIs from their success metrics to build a complete strategic plan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Objective - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objective <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.objective}
              onChange={(e) => handleInputChange('objective', e.target.value)}
              placeholder="What do you want to achieve? (e.g., Increase football ticket sales by 50%, Improve student-athlete graduation rates to 95%, Expand women's sports programs while maintaining Title IX compliance)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          {/* Athletic Conference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Athletic Conference</label>
            <select
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select conference</option>
              <option value="Mid-American Conference (MAC)">Mid-American Conference (MAC)</option>
              <option value="Big Ten Conference">Big Ten Conference</option>
              <option value="Southeastern Conference (SEC)">Southeastern Conference (SEC)</option>
              <option value="Atlantic Coast Conference (ACC)">Atlantic Coast Conference (ACC)</option>
              <option value="Big 12 Conference">Big 12 Conference</option>
              <option value="Pac-12 Conference">Pac-12 Conference</option>
              <option value="American Athletic Conference (AAC)">American Athletic Conference (AAC)</option>
              <option value="Mountain West Conference">Mountain West Conference</option>
              <option value="Conference USA">Conference USA</option>
              <option value="Sun Belt Conference">Sun Belt Conference</option>
              <option value="Independent">Independent</option>
              <option value="Division II Conference">Division II Conference</option>
              <option value="Division III Conference">Division III Conference</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Division Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Division Level & Department Size</label>
            <select
              value={formData.company_size}
              onChange={(e) => handleInputChange('company_size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select division and size</option>
              <option value="Division I FBS - Large (20+ sports)">Division I FBS - Large (20+ sports)</option>
              <option value="Division I FBS - Medium (15-19 sports)">Division I FBS - Medium (15-19 sports)</option>
              <option value="Division I FCS - Large (18+ sports)">Division I FCS - Large (18+ sports)</option>
              <option value="Division I FCS - Medium (12-17 sports)">Division I FCS - Medium (12-17 sports)</option>
              <option value="Division I Non-Football">Division I Non-Football</option>
              <option value="Division II (10+ sports)">Division II (10+ sports)</option>
              <option value="Division III (10+ sports)">Division III (10+ sports)</option>
              <option value="NAIA">NAIA</option>
              <option value="Junior College">Junior College</option>
            </select>
          </div>

          {/* Current Situation */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Situation</label>
            <textarea
              value={formData.current_situation}
              onChange={(e) => handleInputChange('current_situation', e.target.value)}
              placeholder="Describe your athletic department's current state (e.g., Current attendance levels, student-athlete academic performance, facility conditions, fundraising status, competitive standing in conference)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
            <textarea
              value={formData.constraints}
              onChange={(e) => handleInputChange('constraints', e.target.value)}
              placeholder="Athletic budget limits, NCAA compliance requirements, Title IX considerations, facility limitations, academic eligibility standards, scholarship limits"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Available Resources */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Resources</label>
            <textarea
              value={formData.resources}
              onChange={(e) => handleInputChange('resources', e.target.value)}
              placeholder="Coaching staff, athletic trainers, academic support staff, facilities, booster support, media partnerships, sponsorship deals, conference revenue sharing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desired Timeframe</label>
            <input
              type="text"
              value={formData.timeframe}
              onChange={(e) => handleInputChange('timeframe', e.target.value)}
              placeholder="e.g., Single season, One academic year, Multi-year plan, Before next recruitment cycle"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Number of Strategies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Strategies</label>
            <input
              type="number"
              value={numStrategies}
              onChange={(e) => setNumStrategies(parseInt(e.target.value) || 3)}
              min={1}
              max={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={generateMutation.isPending || !formData.objective.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>{generateMutation.isPending ? 'Generating...' : 'Generate Strategies'}</span>
          </button>
        </div>
      </form>

      {/* Error State */}
      {generateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Generation Failed</h3>
            <p className="text-sm text-red-700 mt-1">
              {(generateMutation.error as any)?.response?.data?.error || 'Failed to generate strategies. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty Result Warning */}
      {generateMutation.isSuccess && generatedStrategies.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">No Strategies Generated</h3>
            <p className="text-sm text-yellow-700 mt-1">
              The AI was unable to generate strategies for your objective. This might be due to:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
              <li>The objective being too vague or too specific</li>
              <li>Missing context (try filling in more fields)</li>
              <li>A temporary issue with the AI service</li>
            </ul>
            <p className="text-sm text-yellow-700 mt-2">
              Try rephrasing your objective or providing more context about your situation.
            </p>
          </div>
        </div>
      )}

      {/* Generated Strategies */}
      {generatedStrategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Generated Strategies</h3>
            <span className="text-sm text-gray-600">{generatedStrategies.length} strategies</span>
          </div>

          {generatedStrategies.map((strategy, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Strategy Header */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">{strategy.title}</h4>
                    </div>
                    <p className="text-gray-700">{strategy.description}</p>
                  </div>

                  {/* Action Buttons */}
                  {activeFiscalPlan && (
                    <div className="flex flex-col items-end space-y-2">
                      {/* Add to Plan Button */}
                      {!addedStrategyIds.has(index) ? (
                        <div className="relative">
                          <button
                            onClick={() => setShowPriorityDropdown(showPriorityDropdown === index ? null : index)}
                            disabled={addingToPlan === index}
                            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          >
                            {addingToPlan === index ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Adding...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                <span>Add to Plan</span>
                              </>
                            )}
                          </button>

                          {/* Priority Dropdown */}
                          {showPriorityDropdown === index && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="p-2">
                                <p className="text-xs font-medium text-gray-600 px-2 py-1">Select Priority:</p>
                                {activeFiscalPlan.priorities.map((priority) => (
                                  <button
                                    key={priority.id}
                                    onClick={() => handleAddToPlan(strategy, priority.id)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                        {priority.priority_number}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{priority.title}</p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Added to Plan</span>
                        </div>
                      )}

                      {/* Create/View KPIs Button */}
                      {addedStrategyIds.has(index) && strategy.success_metrics && strategy.success_metrics.length > 0 && (() => {
                        const strategyId = addedStrategyIds.get(index)!;
                        const kpiCount = strategyKPICounts.get(strategyId) || 0;

                        return kpiCount > 0 ? (
                          <a
                            href="/kpis"
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View KPIs ({kpiCount})</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleOpenCreateKPIsModal(index, strategyId, strategy)}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span>Create KPIs ({strategy.success_metrics.length})</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Metrics Row */}
                <div className="flex flex-wrap gap-3">
                  {/* Success Probability */}
                  <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <TrendingUp className={`h-4 w-4 ${getProbabilityColor(strategy.success_probability)}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {(strategy.success_probability * 100).toFixed(0)}% Success Rate
                    </span>
                  </div>

                  {/* Cost */}
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getCostColor(strategy.estimated_cost)}`}>
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium capitalize">{strategy.estimated_cost} Cost</span>
                  </div>

                  {/* Timeframe */}
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{strategy.timeframe}</span>
                  </div>
                </div>

                {/* Rationale */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-purple-900 text-sm mb-2">Why This Strategy Works:</h5>
                  <p className="text-sm text-purple-800">{strategy.rationale}</p>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setExpandedStrategy(expandedStrategy === index ? null : index)}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  {expandedStrategy === index ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span>View Implementation Details</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedStrategy === index && (
                <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-6">
                  {/* Implementation Steps */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h5 className="font-semibold text-gray-900">Implementation Steps</h5>
                    </div>
                    <ol className="space-y-2">
                      {strategy.implementation_steps.map((step, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-gray-700 text-sm">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Risks */}
                  {strategy.risks.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <h5 className="font-semibold text-gray-900">Key Risks</h5>
                      </div>
                      <ul className="space-y-1">
                        {strategy.risks.map((risk, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                            <span className="text-yellow-500 mt-0.5">⚠</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Required Resources */}
                  {strategy.required_resources.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="h-5 w-5 text-blue-600" />
                        <h5 className="font-semibold text-gray-900">Required Resources</h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {strategy.required_resources.map((resource, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                          >
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Metrics */}
                  {strategy.success_metrics.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <h5 className="font-semibold text-gray-900">Success Metrics</h5>
                      </div>
                      <ul className="space-y-1">
                        {strategy.success_metrics.map((metric, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{metric}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Supporting Evidence */}
                  {strategy.supporting_evidence.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h5 className="font-semibold text-gray-900">Supporting Evidence</h5>
                      </div>
                      <ul className="space-y-1">
                        {strategy.supporting_evidence.map((evidence, idx) => (
                          <li key={idx} className="text-sm text-gray-600 italic">
                            • {evidence}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create KPIs Modal */}
      {createKPIsModalStrategy && (
        <CreateKPIsModal
          strategy={{
            ...createKPIsModalStrategy.strategy,
            id: createKPIsModalStrategy.strategyId,
            fiscal_plan_id: activeFiscalPlan?.plan.id || '',
            priority_id: '',
            status: 'draft',
          } as any}
          isOpen={true}
          onClose={() => setCreateKPIsModalStrategy(null)}
          onSuccess={handleKPIsCreated}
        />
      )}
    </div>
  );
}
