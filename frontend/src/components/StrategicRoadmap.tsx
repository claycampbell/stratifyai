import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatKPIValue } from '@/lib/formatters';

interface StrategicRoadmapProps {
  roadmap: any;
}

export default function StrategicRoadmap({ roadmap }: StrategicRoadmapProps) {
  if (!roadmap) return null;

  const strategies = roadmap.strategies || [];
  const kpiTimeline = roadmap.kpi_timeline || [];

  // Group KPIs by frequency for timeline
  const frequencyOrder = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
  const kpisByFrequency = frequencyOrder.map(freq => ({
    frequency: freq,
    kpis: kpiTimeline.filter((k: any) => k.frequency === freq),
  })).filter(group => group.kpis.length > 0);

  // Generate next 6 months for timeline
  const timelineMonths = Array.from({ length: 6 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      month: format(date, 'MMM yyyy'),
      date: date,
    };
  });

  const frequencyColors: Record<string, string> = {
    daily: 'bg-purple-100 text-purple-800 border-purple-300',
    weekly: 'bg-blue-100 text-blue-800 border-blue-300',
    monthly: 'bg-green-100 text-green-800 border-green-300',
    quarterly: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    annual: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusColors: Record<string, string> = {
    on_track: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    off_track: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Strategic Initiatives Timeline */}
      {strategies.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Strategic Initiatives
          </h3>
          <div className="space-y-3">
            {strategies.slice(0, 8).map((strategy: any, index: number) => (
              <div key={strategy.id} className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">{strategy.title}</h4>
                  {strategy.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{strategy.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Started {format(new Date(strategy.created_at), 'MMM dd, yyyy')}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Updated {format(new Date(strategy.updated_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Measurement Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          KPI Measurement Timeline
        </h3>

        {/* Timeline Header */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max border-b border-gray-200 pb-2">
            <div className="w-48 flex-shrink-0 font-semibold text-gray-700">Frequency</div>
            {timelineMonths.map((tm, idx) => (
              <div key={idx} className="w-32 text-center font-semibold text-gray-700 text-sm">
                {tm.month}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Rows */}
        <div className="space-y-4 overflow-x-auto">
          {kpisByFrequency.map((group) => (
            <div key={group.frequency} className="flex min-w-max items-center">
              <div className="w-48 flex-shrink-0">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${frequencyColors[group.frequency]}`}>
                  {group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1)}
                  <span className="ml-2 text-xs">({group.kpis.length})</span>
                </span>
              </div>
              {timelineMonths.map((tm, idx) => {
                const monthNumber = tm.date.getMonth();
                const shouldShow =
                  (group.frequency === 'daily') ||
                  (group.frequency === 'weekly') ||
                  (group.frequency === 'monthly') ||
                  (group.frequency === 'quarterly' && monthNumber % 3 === 0) ||
                  (group.frequency === 'annual' && monthNumber === 0);

                return (
                  <div key={idx} className="w-32 flex justify-center">
                    {shouldShow && (
                      <div className="relative group">
                        <div className="w-4 h-4 rounded-full bg-blue-600 cursor-pointer hover:scale-125 transition-transform" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            {group.kpis.length} KPIs due
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">KPIs by Frequency:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {kpisByFrequency.map((group) => (
              <div key={group.frequency} className="text-sm">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${frequencyColors[group.frequency]}`}>
                  {group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1)}: {group.kpis.length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Status Overview */}
      {kpiTimeline.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active KPIs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpiTimeline.slice(0, 12).map((kpi: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{kpi.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${statusColors[kpi.status]}`} />
                      <span className="text-xs text-gray-600 capitalize">{kpi.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${frequencyColors[kpi.frequency]}`}>
                    {kpi.frequency.charAt(0).toUpperCase() + kpi.frequency.slice(1)}
                  </span>
                </div>
                {kpi.current_value !== null && kpi.target_value !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{formatKPIValue(kpi.current_value, kpi.unit)}</span>
                      <span>{formatKPIValue(kpi.target_value, kpi.unit)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          kpi.status === 'on_track'
                            ? 'bg-green-500'
                            : kpi.status === 'at_risk'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min((parseFloat(kpi.current_value) / parseFloat(kpi.target_value)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
