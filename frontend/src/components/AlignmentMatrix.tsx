import { ChevronRight, Target, Flag, Lightbulb, BarChart3, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { formatKPIValuePair } from '@/lib/formatters';

interface AlignmentMatrixProps {
  alignment: any[];
}

export default function AlignmentMatrix({ alignment }: AlignmentMatrixProps) {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  if (!alignment || alignment.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Alignment Matrix</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No strategic alignment data available yet.</p>
          <p className="text-sm mt-2">Add OGSM components and link KPIs to see the alignment.</p>
        </div>
      </div>
    );
  }

  // Group alignment data by objective
  const alignmentByObjective = alignment.reduce((acc: any, item: any) => {
    if (!item.objective_id) return acc;

    if (!acc[item.objective_id]) {
      acc[item.objective_id] = {
        id: item.objective_id,
        title: item.objective_title,
        goals: {},
      };
    }

    if (item.goal_id && !acc[item.objective_id].goals[item.goal_id]) {
      acc[item.objective_id].goals[item.goal_id] = {
        id: item.goal_id,
        title: item.goal_title,
        strategies: {},
      };
    }

    if (item.strategy_id && item.goal_id && !acc[item.objective_id].goals[item.goal_id].strategies[item.strategy_id]) {
      acc[item.objective_id].goals[item.goal_id].strategies[item.strategy_id] = {
        id: item.strategy_id,
        title: item.strategy_title,
        measures: [],
        kpis: [],
      };
    }

    if (item.measure_id && item.strategy_id && item.goal_id) {
      const strategy = acc[item.objective_id].goals[item.goal_id].strategies[item.strategy_id];
      const existingMeasure = strategy.measures.find((m: any) => m.id === item.measure_id);
      if (!existingMeasure) {
        strategy.measures.push({
          id: item.measure_id,
          title: item.measure_title,
        });
      }
    }

    if (item.kpi_id && item.strategy_id && item.goal_id) {
      const strategy = acc[item.objective_id].goals[item.goal_id].strategies[item.strategy_id];
      const existingKpi = strategy.kpis.find((k: any) => k.id === item.kpi_id);
      if (!existingKpi) {
        strategy.kpis.push({
          id: item.kpi_id,
          name: item.kpi_name,
          status: item.kpi_status,
          current_value: item.current_value,
          target_value: item.target_value,
          unit: item.unit,
        });
      }
    }

    return acc;
  }, {});

  const objectives = Object.values(alignmentByObjective);

  const toggleObjective = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  const statusColors = {
    on_track: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    off_track: 'bg-red-500',
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
        Strategic Alignment Matrix
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Visualize how your KPIs connect to strategies, goals, and objectives
      </p>

      <div className="space-y-3">
        {objectives.map((objective: any) => {
          const isExpanded = expandedObjectives.has(objective.id);
          const goals = Object.values(objective.goals);

          return (
            <div key={objective.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Objective Level */}
              <div
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                onClick={() => toggleObjective(objective.id)}
              >
                <ChevronRight
                  className={`h-5 w-5 text-blue-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
                <Target className="h-5 w-5 text-blue-600 ml-2" />
                <div className="ml-3 flex-1">
                  <h4 className="font-semibold text-gray-900">{objective.title}</h4>
                  <p className="text-sm text-gray-600">
                    {goals.length} goal{goals.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Goals Level */}
              {isExpanded && (
                <div className="bg-white">
                  {goals.map((goal: any) => {
                    const strategies = Object.values(goal.strategies);

                    return (
                      <div key={goal.id} className="border-t border-gray-200">
                        <div className="flex items-start p-4 pl-12 bg-green-50">
                          <Flag className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="ml-3 flex-1">
                            <h5 className="font-semibold text-gray-900">{goal.title}</h5>
                            <p className="text-sm text-gray-600">
                              {strategies.length} strateg{strategies.length !== 1 ? 'ies' : 'y'}
                            </p>
                          </div>
                        </div>

                        {/* Strategies Level */}
                        {strategies.map((strategy: any) => (
                          <div key={strategy.id} className="border-t border-gray-100">
                            <div className="flex items-start p-4 pl-20 bg-purple-50">
                              <Lightbulb className="h-5 w-5 text-purple-600 flex-shrink-0" />
                              <div className="ml-3 flex-1">
                                <h6 className="font-semibold text-gray-900">{strategy.title}</h6>

                                {/* Measures */}
                                {strategy.measures.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Measures:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {strategy.measures.map((measure: any) => (
                                        <span
                                          key={measure.id}
                                          className="inline-block px-2 py-1 text-xs bg-white border border-gray-300 rounded"
                                        >
                                          {measure.title}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* KPIs */}
                                {strategy.kpis.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      Linked KPIs:
                                    </p>
                                    <div className="space-y-2">
                                      {strategy.kpis.map((kpi: any) => (
                                        <div
                                          key={kpi.id}
                                          className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`w-2 h-2 rounded-full ${statusColors[kpi.status as keyof typeof statusColors]}`}
                                            />
                                            <span className="font-medium">{kpi.name}</span>
                                          </div>
                                          {kpi.current_value !== null && kpi.target_value !== null && (
                                            <span className="text-xs text-gray-600">
                                              {formatKPIValuePair(kpi.current_value, kpi.target_value, kpi.unit)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {strategy.measures.length === 0 && strategy.kpis.length === 0 && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    No measures or KPIs linked yet
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {objectives.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No objectives found. Create your OGSM structure to see alignment.</p>
        </div>
      )}
    </div>
  );
}
