import { useQuery } from '@tanstack/react-query';
import { ogsmApi, kpisApi } from '@/lib/api';
import { TrendingUp, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: ogsmComponents } = useQuery({
    queryKey: ['ogsm'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your AI-powered OGSM Management Platform
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

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/documents"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Upload Documents</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload strategic plans and track progress
            </p>
          </a>
          <a
            href="/ai-chat"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">AI Strategy Chat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Get strategic insights from your AI advisor
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
