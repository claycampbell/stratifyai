import { useQuery } from '@tanstack/react-query';
import { ogsmApi, kpisApi, dashboardApi } from '@/lib/api';
import { TrendingUp, Target, AlertCircle, CheckCircle, BarChart3, Calendar, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StrategicOverview from '@/components/StrategicOverview';
import KPITrendsChart from '@/components/KPITrendsChart';
import StrategicRoadmap from '@/components/StrategicRoadmap';
import AlignmentMatrix from '@/components/AlignmentMatrix';
import PhilosophyQuickReference from '@/components/PhilosophyQuickReference';
import RecentValidations from '@/components/RecentValidations';
import AlignmentScoreWidget from '@/components/AlignmentScoreWidget';
import AthleticsDirectorDashboard from './AthleticsDirectorDashboard';
import ManagerDashboard from './ManagerDashboard';
import StaffDashboard from './StaffDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Route to role-specific dashboards
  if (user?.role === 'athletics_director' || user?.role === 'super_admin') {
    return <AthleticsDirectorDashboard />;
  }

  if (user?.role === 'manager' || user?.role === 'department_director') {
    return <ManagerDashboard />;
  }

  if (user?.role === 'staff') {
    return <StaffDashboard />;
  }

  // Default dashboard for other roles
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'roadmap' | 'alignment'>('overview');

  const { data: ogsmComponents } = useQuery({
    queryKey: ['ogsm'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => dashboardApi.getAnalytics().then((res) => res.data),
  });

  const { data: roadmap, isLoading: roadmapLoading } = useQuery({
    queryKey: ['dashboard-roadmap'],
    queryFn: () => dashboardApi.getRoadmap().then((res) => res.data),
    enabled: activeView === 'roadmap',
  });

  const { data: alignment, isLoading: alignmentLoading } = useQuery({
    queryKey: ['dashboard-alignment'],
    queryFn: () => dashboardApi.getAlignment().then((res) => res.data),
    enabled: activeView === 'alignment',
  });

  const stats = [
    {
      name: 'Objectives',
      value: ogsmComponents?.filter((c: any) => c.component_type === 'objective').length || 0,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/ogsm?filter=objective',
    },
    {
      name: 'Goals',
      value: ogsmComponents?.filter((c: any) => c.component_type === 'goal').length || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/ogsm?filter=goal',
    },
    {
      name: 'Strategies',
      value: ogsmComponents?.filter((c: any) => c.component_type === 'strategy').length || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/ogsm?filter=strategy',
    },
    {
      name: 'KPIs',
      value: kpis?.length || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      link: '/kpis',
    },
  ];

  const kpisByStatus = {
    on_track: kpis?.filter((k: any) => k.status === 'on_track').length || 0,
    at_risk: kpis?.filter((k: any) => k.status === 'at_risk').length || 0,
    off_track: kpis?.filter((k: any) => k.status === 'off_track').length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Strategic Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Real-time view of your organizational strategy and performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} to={stat.link} className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* KPI Status */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">KPI Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/kpis?status=on_track" className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">On Track</p>
              <p className="text-2xl font-bold text-gray-900">{kpisByStatus.on_track}</p>
            </div>
          </Link>
          <Link to="/kpis?status=at_risk" className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">{kpisByStatus.at_risk}</p>
            </div>
          </Link>
          <Link to="/kpis?status=off_track" className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Off Track</p>
              <p className="text-2xl font-bold text-gray-900">{kpisByStatus.off_track}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Philosophy Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PhilosophyQuickReference />
        <RecentValidations />
        <AlignmentScoreWidget />
      </div>

      {/* View Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Strategic Overview', icon: Activity },
              { key: 'trends', label: 'KPI Trends', icon: TrendingUp },
              { key: 'roadmap', label: 'Roadmap', icon: Calendar },
              { key: 'alignment', label: 'Alignment Matrix', icon: BarChart3 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pt-6">
          {activeView === 'overview' && (
            analyticsLoading ? (
              <div className="text-center py-12 text-gray-600">Loading strategic overview...</div>
            ) : (
              <StrategicOverview analytics={analytics} />
            )
          )}

          {activeView === 'trends' && (
            analyticsLoading ? (
              <div className="text-center py-12 text-gray-600">Loading KPI trends...</div>
            ) : (
              <KPITrendsChart analytics={analytics} />
            )
          )}

          {activeView === 'roadmap' && (
            roadmapLoading ? (
              <div className="text-center py-12 text-gray-600">Loading roadmap...</div>
            ) : (
              <StrategicRoadmap roadmap={roadmap} />
            )
          )}

          {activeView === 'alignment' && (
            alignmentLoading ? (
              <div className="text-center py-12 text-gray-600">Loading alignment matrix...</div>
            ) : (
              <AlignmentMatrix alignment={alignment} />
            )
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/documents"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Upload Documents</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload strategic plans and track progress
            </p>
          </Link>
          <Link
            to="/ai-chat"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">AI Strategy Chat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Get strategic insights from your AI advisor
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
