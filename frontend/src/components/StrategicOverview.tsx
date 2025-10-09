import { Target, TrendingUp, CheckCircle, Activity } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface StrategicOverviewProps {
  analytics: any;
}

const COLORS = {
  objective: '#3b82f6',
  goal: '#10b981',
  strategy: '#8b5cf6',
  measure: '#f59e0b',
  on_track: '#10b981',
  at_risk: '#f59e0b',
  off_track: '#ef4444',
};

export default function StrategicOverview({ analytics }: StrategicOverviewProps) {
  if (!analytics) return null;

  // Prepare OGSM data for pie chart
  const ogsmData = analytics.ogsm_counts?.map((item: any) => ({
    name: item.component_type.charAt(0).toUpperCase() + item.component_type.slice(1),
    value: parseInt(item.count),
    color: COLORS[item.component_type as keyof typeof COLORS],
  })) || [];

  // Prepare KPI status data for pie chart
  const kpiStatusData = analytics.kpi_status?.map((item: any) => ({
    name: item.status.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: parseInt(item.count),
    color: COLORS[item.status as keyof typeof COLORS],
  })) || [];

  // Prepare radar chart data for strategic health
  const radarData = [
    {
      category: 'Objectives',
      value: analytics.ogsm_counts?.find((c: any) => c.component_type === 'objective')?.count || 0,
      fullMark: 10,
    },
    {
      category: 'Goals',
      value: analytics.ogsm_counts?.find((c: any) => c.component_type === 'goal')?.count || 0,
      fullMark: 20,
    },
    {
      category: 'Strategies',
      value: analytics.ogsm_counts?.find((c: any) => c.component_type === 'strategy')?.count || 0,
      fullMark: 30,
    },
    {
      category: 'Measures',
      value: analytics.ogsm_counts?.find((c: any) => c.component_type === 'measure')?.count || 0,
      fullMark: 20,
    },
    {
      category: 'KPIs',
      value: analytics.overall_progress?.total_kpis || 0,
      fullMark: 50,
    },
  ];

  const overallProgress = analytics.overall_progress;
  const completionPercentage = Math.round(overallProgress?.avg_completion_percentage || 0);
  const healthScore = overallProgress?.total_kpis > 0
    ? Math.round(
        ((overallProgress.on_track * 100) + (overallProgress.at_risk * 50)) /
        overallProgress.total_kpis
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Strategic Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Health Score</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{healthScore}%</p>
            </div>
            <Activity className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Completion</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{completionPercentage}%</p>
            </div>
            <Target className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total KPIs</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {overallProgress?.total_kpis || 0}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">On Track</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">
                {overallProgress?.on_track || 0}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OGSM Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">OGSM Distribution</h3>
          {ogsmData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ogsmData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ogsmData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              <p>No OGSM components yet</p>
            </div>
          )}
        </div>

        {/* KPI Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">KPI Status</h3>
          {kpiStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={kpiStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {kpiStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              <p>No KPIs yet</p>
            </div>
          )}
        </div>

        {/* Strategic Health Radar */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Coverage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 50]} />
              <Radar
                name="Current"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
