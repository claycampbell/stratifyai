import { useQuery } from '@tanstack/react-query';
import { ogsmApi, kpisApi, dashboardApi } from '@/lib/api';
import axios from 'axios';
import {
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Users,
  DollarSign,
  Trophy,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingDown,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AthleticsDirectorDashboard() {
  const { user } = useAuth();

  const { data: ogsmComponents } = useQuery({
    queryKey: ['ogsm'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => dashboardApi.getAnalytics().then((res) => res.data),
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => axios.get(`${API_URL}/users/stats/overview`).then((res) => res.data),
  });

  // Calculate KPI health
  const kpiHealth = kpis?.reduce((acc: any, kpi: any) => {
    if (!kpi.target_value || !kpi.current_value) return acc;

    const progress = (kpi.current_value / kpi.target_value) * 100;
    if (progress >= 90) acc.onTrack++;
    else if (progress >= 70) acc.atRisk++;
    else acc.offTrack++;

    return acc;
  }, { onTrack: 0, atRisk: 0, offTrack: 0 }) || { onTrack: 0, atRisk: 0, offTrack: 0 };

  // Executive summary stats
  const executiveStats = [
    {
      name: 'Strategic Objectives',
      value: ogsmComponents?.filter((c: any) => c.component_type === 'objective').length || 0,
      change: '+2 this quarter',
      trend: 'up' as const,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/ogsm?filter=objective',
    },
    {
      name: 'Active KPIs',
      value: kpis?.length || 0,
      change: `${kpiHealth.onTrack} on track`,
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/kpis',
    },
    {
      name: 'Team Members',
      value: userStats?.users?.total_users || 0,
      change: `${userStats?.users?.active_users || 0} active`,
      trend: 'neutral' as const,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/admin',
    },
    {
      name: 'Strategic Initiatives',
      value: ogsmComponents?.filter((c: any) => c.component_type === 'strategy').length || 0,
      change: 'Across all programs',
      trend: 'neutral' as const,
      icon: Shield,
      color: 'text-primary-600',
      bg: 'bg-primary-100',
      link: '/strategic-planning',
    },
  ];

  // Performance indicators
  const performanceIndicators = [
    {
      category: 'KPI Performance',
      metrics: [
        { label: 'On Track', value: kpiHealth.onTrack, total: kpis?.length || 0, color: 'bg-green-500' },
        { label: 'At Risk', value: kpiHealth.atRisk, total: kpis?.length || 0, color: 'bg-yellow-500' },
        { label: 'Off Track', value: kpiHealth.offTrack, total: kpis?.length || 0, color: 'bg-red-500' },
      ]
    },
    {
      category: 'Strategic Alignment',
      metrics: [
        {
          label: 'Objectives',
          value: ogsmComponents?.filter((c: any) => c.component_type === 'objective').length || 0,
          total: 10,
          color: 'bg-blue-500'
        },
        {
          label: 'Goals',
          value: ogsmComponents?.filter((c: any) => c.component_type === 'goal').length || 0,
          total: 25,
          color: 'bg-indigo-500'
        },
        {
          label: 'Strategies',
          value: ogsmComponents?.filter((c: any) => c.component_type === 'strategy').length || 0,
          total: 50,
          color: 'bg-purple-500'
        },
      ]
    },
  ];

  // Recent activities
  const recentActivities = [
    {
      action: 'KPI Updated',
      description: 'Student-Athlete GPA target exceeded by 5%',
      time: '2 hours ago',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      action: 'New Objective',
      description: 'Enhance Athletic Facilities added to strategic plan',
      time: '5 hours ago',
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      action: 'Team Update',
      description: '3 new staff members onboarded',
      time: '1 day ago',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      action: 'Report Generated',
      description: 'Q3 Strategic Performance Report completed',
      time: '2 days ago',
      icon: FileText,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
    },
  ];

  // Priority actions
  const priorityActions = [
    {
      title: 'Review Budget Allocations',
      description: 'Q4 budget review deadline approaching',
      priority: 'high' as const,
      dueDate: 'Due in 3 days',
      link: '/strategic-planning',
    },
    {
      title: 'Approve KPI Targets',
      description: '5 KPIs pending your approval for next quarter',
      priority: 'high' as const,
      dueDate: 'Due in 5 days',
      link: '/kpis',
    },
    {
      title: 'Strategic Planning Session',
      description: 'Prepare for annual planning meeting',
      priority: 'medium' as const,
      dueDate: 'Due in 2 weeks',
      link: '/ogsm',
    },
    {
      title: 'Review Compliance Reports',
      description: 'NCAA compliance documentation review',
      priority: 'medium' as const,
      dueDate: 'Due in 3 weeks',
      link: '/reports',
    },
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <ArrowUp className="h-4 w-4" />;
    if (trend === 'down') return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') return 'border-l-4 border-red-500 bg-red-50';
    if (priority === 'medium') return 'border-l-4 border-yellow-500 bg-yellow-50';
    return 'border-l-4 border-blue-500 bg-blue-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Athletics Director Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.first_name}! Here's your strategic overview.
        </p>
      </div>

      {/* Executive Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {executiveStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    {getTrendIcon(stat.trend)}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className={`h-12 w-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Performance & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Indicators */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>

            {performanceIndicators.map((section) => (
              <div key={section.category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-medium text-gray-700 mb-3">{section.category}</h3>
                <div className="space-y-3">
                  {section.metrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{metric.label}</span>
                        <span className="font-medium text-gray-900">
                          {metric.value} / {metric.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${(metric.value / metric.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
              <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`h-10 w-10 ${activity.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Priority Actions */}
        <div className="space-y-6">
          {/* Priority Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Priority Actions
            </h2>

            <div className="space-y-3">
              {priorityActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`block p-4 rounded-lg ${getPriorityColor(action.priority)} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                      <p className="text-xs font-medium text-gray-700 mt-2">{action.dueDate}</p>
                    </div>
                    {action.priority === 'high' && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        High
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <div className="space-y-2">
              <Link
                to="/ogsm"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Review Strategic Plan</span>
              </Link>
              <Link
                to="/kpis"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Update KPIs</span>
              </Link>
              <Link
                to="/reports"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Generate Report</span>
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Manage Team</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Health Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">KPI Health Summary</h2>
          <Link to="/kpis" className="text-sm text-primary-600 hover:text-primary-700">
            View All KPIs
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">On Track</span>
            </div>
            <p className="text-3xl font-bold text-green-900">{kpiHealth.onTrack}</p>
            <p className="text-xs text-green-700 mt-1">
              {kpis?.length ? Math.round((kpiHealth.onTrack / kpis.length) * 100) : 0}% of total KPIs
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">At Risk</span>
            </div>
            <p className="text-3xl font-bold text-yellow-900">{kpiHealth.atRisk}</p>
            <p className="text-xs text-yellow-700 mt-1">
              Requires attention
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Off Track</span>
            </div>
            <p className="text-3xl font-bold text-red-900">{kpiHealth.offTrack}</p>
            <p className="text-xs text-red-700 mt-1">
              Immediate action needed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
