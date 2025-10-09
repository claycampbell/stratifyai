import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { useState } from 'react';

interface KPITrendsChartProps {
  analytics: any;
}

export default function KPITrendsChart({ analytics }: KPITrendsChartProps) {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  if (!analytics?.kpi_trends) return null;

  // Group trends by KPI
  const kpiTrendMap = analytics.kpi_trends.reduce((acc: any, trend: any) => {
    if (!acc[trend.id]) {
      acc[trend.id] = {
        id: trend.id,
        name: trend.name,
        unit: trend.unit,
        data: [],
      };
    }
    acc[trend.id].data.push({
      date: format(new Date(trend.recorded_date), 'MMM dd'),
      value: parseFloat(trend.value),
    });
    return acc;
  }, {});

  const kpiTrends = Object.values(kpiTrendMap) as any[];
  const displayedKPI: any = selectedKPI ? kpiTrends.find((k: any) => k.id === selectedKPI) : kpiTrends[0];

  // Prepare KPI progress data
  const progressData = analytics.kpi_progress?.slice(0, 8).map((kpi: any) => ({
    name: kpi.name.length > 15 ? kpi.name.substring(0, 15) + '...' : kpi.name,
    current: parseFloat(kpi.current_value) || 0,
    target: parseFloat(kpi.target_value) || 0,
    progress: kpi.target_value ? Math.round((parseFloat(kpi.current_value) / parseFloat(kpi.target_value)) * 100) : 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* KPI Trend Line Chart */}
      {kpiTrends.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">KPI Performance Trends</h3>
            <select
              value={selectedKPI || ''}
              onChange={(e) => setSelectedKPI(e.target.value || null)}
              className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select KPI</option>
              {kpiTrends.map((kpi: any) => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.name}
                </option>
              ))}
            </select>
          </div>

          {displayedKPI && displayedKPI.data.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Tracking: <span className="font-semibold">{displayedKPI.name}</span>
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayedKPI.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name={`Value (${displayedKPI.unit})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No historical data available</p>
            </div>
          )}
        </div>
      )}

      {/* KPI Progress Bar Chart */}
      {progressData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            KPI Progress: Current vs Target
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={progressData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#3b82f6" name="Current Value" />
              <Bar dataKey="target" fill="#10b981" name="Target Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress Percentage Bars */}
      {progressData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Status</h3>
          <div className="space-y-4">
            {progressData.slice(0, 10).map((kpi: any, index: number) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{kpi.name}</span>
                  <span className="font-semibold text-gray-900">{kpi.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      kpi.progress >= 100
                        ? 'bg-green-600'
                        : kpi.progress >= 75
                        ? 'bg-blue-600'
                        : kpi.progress >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
