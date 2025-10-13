import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiStrategyApi } from '@/lib/api';
import { Sparkles, TrendingUp, AlertTriangle, Target, Clock, DollarSign, CheckCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { StrategyGenerationContext, GeneratedStrategy, StrategyGenerationResponse } from '@/types';

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
            Generate data-driven strategies using AI and our knowledge base of successful implementations
          </p>
        </div>
      </div>

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
              placeholder="What do you want to achieve? (e.g., Increase market share by 15% in the next year)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              placeholder="e.g., Technology, Healthcare, Education"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Company Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
            <select
              value={formData.company_size}
              onChange={(e) => handleInputChange('company_size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select size</option>
              <option value="startup">Startup (1-50)</option>
              <option value="small">Small (51-200)</option>
              <option value="medium">Medium (201-1000)</option>
              <option value="large">Large (1000+)</option>
              <option value="enterprise">Enterprise (10000+)</option>
            </select>
          </div>

          {/* Current Situation */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Situation</label>
            <textarea
              value={formData.current_situation}
              onChange={(e) => handleInputChange('current_situation', e.target.value)}
              placeholder="Describe your current state (e.g., Market position, team size, current capabilities)"
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
              placeholder="Budget limits, time constraints, regulatory requirements"
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
              placeholder="Team, budget, technology, partnerships"
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
              placeholder="e.g., 6 months, 1 year, 3 years"
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
    </div>
  );
}
