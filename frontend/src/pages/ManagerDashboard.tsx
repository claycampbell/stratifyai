import { useQuery } from '@tanstack/react-query';
import { ogsmApi, kpisApi } from '@/lib/api';
import {
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  ListTodo,
  BarChart3,
  ArrowRight,
  Zap,
  Users,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ManagerDashboard() {
  const { user } = useAuth();

  const { data: ogsmComponents } = useQuery({
    queryKey: ['ogsm'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  // Filter for my assigned items (in a real app, this would be filtered by user assignment)
  const myStrategies = ogsmComponents?.filter((c: any) => c.component_type === 'strategy') || [];
  const myKPIs = kpis || [];

  // Calculate my KPI performance
  const myKPIStats = myKPIs.reduce((acc: any, kpi: any) => {
    if (!kpi.target_value || !kpi.current_value) return acc;

    const progress = (kpi.current_value / kpi.target_value) * 100;
    if (progress >= 90) {
      acc.achieving++;
    } else if (progress >= 70) {
      acc.needsAttention++;
    } else {
      acc.critical++;
    }

    return acc;
  }, { achieving: 0, needsAttention: 0, critical: 0 });

  // My focus areas
  const focusAreas = [
    {
      title: 'Strategy Execution',
      value: myStrategies.length,
      target: myStrategies.length + 2,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/ogsm?filter=strategy',
    },
    {
      title: 'KPIs Managed',
      value: myKPIs.length,
      progress: myKPIStats.achieving,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/kpis',
    },
    {
      title: 'Action Items',
      value: 7,
      urgent: 3,
      icon: ListTodo,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      link: '/strategic-planning',
    },
    {
      title: 'Team Collaboration',
      value: 12,
      active: 8,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/documents',
    },
  ];

  // My active strategies with progress
  const activeStrategies = myStrategies.slice(0, 5).map((strategy: any, index: number) => ({
    title: strategy.title || `Strategy ${index + 1}`,
    description: strategy.description?.substring(0, 100) + '...' || 'No description',
    progress: Math.floor(Math.random() * 40 + 50), // Mock progress
    status: Math.random() > 0.7 ? 'at-risk' : 'on-track',
    dueDate: 'Q4 2025',
    link: `/ogsm?id=${strategy.id}`,
  }));

  // My KPIs with status
  const myKPIsList = myKPIs.slice(0, 6).map((kpi: any) => {
    const progress = kpi.target_value && kpi.current_value
      ? (kpi.current_value / kpi.target_value) * 100
      : 0;

    let status: 'achieving' | 'on-track' | 'needs-attention' | 'critical' = 'on-track';
    if (progress >= 90) status = 'achieving';
    else if (progress >= 70) status = 'on-track';
    else if (progress >= 50) status = 'needs-attention';
    else status = 'critical';

    return {
      name: kpi.name,
      current: kpi.current_value || 0,
      target: kpi.target_value || 100,
      progress,
      status,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      link: `/kpis?id=${kpi.id}`,
    };
  });

  // This week's priorities
  const weeklyPriorities = [
    {
      title: 'Update Q4 KPI Targets',
      category: 'KPIs',
      priority: 'high',
      dueDate: 'Tomorrow',
      completed: false,
    },
    {
      title: 'Review Team Performance Metrics',
      category: 'Team',
      priority: 'high',
      dueDate: 'Friday',
      completed: false,
    },
    {
      title: 'Strategic Alignment Meeting',
      category: 'Strategy',
      priority: 'medium',
      dueDate: 'This Week',
      completed: false,
    },
    {
      title: 'Submit Monthly Report',
      category: 'Reporting',
      priority: 'high',
      dueDate: 'End of Week',
      completed: true,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieving':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'needs-attention':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'achieving':
        return 'Achieving';
      case 'on-track':
        return 'On Track';
      case 'needs-attention':
        return 'Needs Attention';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Hi {user?.first_name}, manage your strategies and track KPI performance
        </p>
      </div>

      {/* Focus Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {focusAreas.map((area) => {
          const Icon = area.icon;
          return (
            <Link
              key={area.title}
              to={area.link}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 ${area.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${area.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{area.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{area.value}</p>
              <p className="text-xs text-gray-500 mt-2">
                {area.progress !== undefined && `${area.progress} achieving targets`}
                {area.urgent !== undefined && `${area.urgent} urgent items`}
                {area.active !== undefined && `${area.active} active`}
                {area.target !== undefined && `Target: ${area.target}`}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Strategies & KPIs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Strategies */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Active Strategies</h2>
              <Link to="/ogsm" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {activeStrategies.map((strategy: { title: string; description: string; status: string; link: string; metric?: string; progress?: number; dueDate?: string }, index: number) => (
                <Link
                  key={index}
                  to={strategy.link}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{strategy.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{strategy.description}</p>
                    </div>
                    {strategy.status === 'at-risk' && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded flex-shrink-0">
                        At Risk
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{strategy.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${strategy.status === 'at-risk' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${strategy.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{strategy.dueDate}</span>
                    </div>
                  </div>
                </Link>
              ))}

              {activeStrategies.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No active strategies assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* My KPIs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My KPIs</h2>
              <Link to="/kpis" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Manage All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {myKPIsList.map((kpi: { name: string; value: string; change: string; status: string; link: string; current?: number; target?: number; progress?: number }, index: number) => (
                <Link
                  key={index}
                  to={kpi.link}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(kpi.status)}`} />
                      <span className="text-sm font-medium text-gray-900">{kpi.name}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {getStatusLabel(kpi.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{kpi.current.toFixed(1)} / {kpi.target.toFixed(1)}</span>
                        <span className="font-medium">{Math.round(kpi.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getStatusColor(kpi.status)}`}
                          style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {myKPIsList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No KPIs assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Priorities & Actions */}
        <div className="space-y-6">
          {/* Weekly Priorities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              This Week's Priorities
            </h2>

            <div className="space-y-3">
              {weeklyPriorities.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.completed
                      ? 'border-green-200 bg-green-50'
                      : item.priority === 'high'
                      ? 'border-red-200 bg-red-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${
                        item.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-white border-2 border-gray-300'
                      }`}
                    >
                      {item.completed && <CheckCircle className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-white rounded text-gray-600">
                          {item.category}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <div className="space-y-2">
              <Link
                to="/kpis"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Update KPI Progress</span>
              </Link>
              <Link
                to="/ogsm"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Review Strategies</span>
              </Link>
              <Link
                to="/reports"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Generate Report</span>
              </Link>
              <Link
                to="/ai-strategy"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">AI Strategy Assistant</span>
              </Link>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Achieving Targets</span>
                <span className="text-sm font-bold text-green-700">{myKPIStats.achieving}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Needs Attention</span>
                <span className="text-sm font-bold text-yellow-700">{myKPIStats.needsAttention}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Critical</span>
                <span className="text-sm font-bold text-red-700">{myKPIStats.critical}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
