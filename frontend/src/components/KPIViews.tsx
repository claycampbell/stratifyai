import { AlertCircle, CheckCircle, Trash2, Target } from 'lucide-react';

const statusColors: Record<string, string> = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  off_track: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<string, typeof CheckCircle> = {
  on_track: CheckCircle,
  at_risk: AlertCircle,
  off_track: AlertCircle,
};

const progressColors = [
  { threshold: 90, color: 'bg-green-500' },
  { threshold: 70, color: 'bg-blue-500' },
  { threshold: 50, color: 'bg-yellow-500' },
  { threshold: 0, color: 'bg-red-500' },
];

function getProgressColor(progress: number): string {
  for (const pc of progressColors) {
    if (progress >= pc.threshold) return pc.color;
  }
  return 'bg-gray-500';
}

interface KPIViewsProps {
  kpis: any[];
  isLoading: boolean;
  viewMode?: string;
  onKPIClick: (id: string) => void;
  onKPIDelete: (e: React.MouseEvent, id: string) => void;
}

export default function KPIViews({ kpis, isLoading, onKPIClick, onKPIDelete }: KPIViewsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!kpis || kpis.length === 0) {
    return (
      <div className="text-center py-16">
        <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-600">No KPIs found</p>
        <p className="text-sm text-gray-500 mt-1">Create your first KPI to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {kpis.map((kpi: any) => {
        const StatusIcon = statusIcons[kpi.status] || AlertCircle;
        const progress = kpi.target_value && kpi.current_value
          ? Math.min((kpi.current_value / kpi.target_value) * 100, 100)
          : 0;

        return (
          <div
            key={kpi.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
            onClick={() => onKPIClick(kpi.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{kpi.name}</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border mt-1.5 ${
                    statusColors[kpi.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {kpi.status.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onKPIDelete(e, kpi.id); }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Delete KPI"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Progress</span>
                <span className="font-semibold text-gray-900">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{kpi.current_value ?? 0} {kpi.unit}</span>
                <span>Target: {kpi.target_value ?? 'N/A'} {kpi.unit}</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              {kpi.ownership && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Owner</span>
                  <span className="font-medium text-gray-900 truncate ml-2">{kpi.ownership}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Frequency</span>
                <span className="font-medium text-gray-900 capitalize">{kpi.frequency}</span>
              </div>
              {(kpi.persons_responsible?.length > 0) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {kpi.persons_responsible.map((person: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {person}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
