import { TrendingUp, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

const statusColors = {
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-yellow-100 text-yellow-800',
  off_track: 'bg-red-100 text-red-800',
};

const statusIcons = {
  on_track: CheckCircle,
  at_risk: AlertCircle,
  off_track: AlertCircle,
};

interface KPIViewsProps {
  kpis: any[];
  isLoading: boolean;
  viewMode: 'boxes' | 'list' | 'compact';
  onKPIClick: (id: string) => void;
  onKPIDelete: (e: React.MouseEvent, id: string) => void;
}

export default function KPIViews({ kpis, isLoading, viewMode, onKPIClick, onKPIDelete }: KPIViewsProps) {
  if (isLoading) {
    return <p className="text-gray-600">Loading KPIs...</p>;
  }

  if (!kpis || kpis.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <p className="text-gray-600">No KPIs found. Create your first KPI!</p>
      </div>
    );
  }

  // Helper to parse description fields
  const parseFields = (description?: string) => {
    const descParts = description ? description.split(' | ') : [];
    const fields: Record<string, string> = {};
    descParts.forEach((part: string) => {
      const [key, ...valueParts] = part.split(': ');
      if (key && valueParts.length > 0) {
        fields[key] = valueParts.join(': ');
      }
    });
    return fields;
  };

  // BOX VIEW (current default)
  if (viewMode === 'boxes') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi: any) => {
          const StatusIcon = statusIcons[kpi.status as keyof typeof statusIcons] || AlertCircle;
          const fields = parseFields(kpi.description);

          return (
            <div
              key={kpi.id}
              className="card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onKPIClick(kpi.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{kpi.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[kpi.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {kpi.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => onKPIDelete(e, kpi.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete KPI"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                {kpi.ownership && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ownership</span>
                    <span className="font-semibold">{kpi.ownership}</span>
                  </div>
                )}
                {kpi.persons_responsible && kpi.persons_responsible.length > 0 && (
                  <div className="flex flex-col text-sm gap-1">
                    <span className="text-gray-600">Team</span>
                    <div className="flex flex-wrap gap-1">
                      {kpi.persons_responsible.map((person: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {person}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {fields.Goal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Goal</span>
                    <span className="font-semibold">{fields.Goal}</span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500 capitalize">
                    Frequency: {kpi.frequency}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {kpis.map((kpi: any) => {
          const StatusIcon = statusIcons[kpi.status as keyof typeof statusIcons] || AlertCircle;
          const fields = parseFields(kpi.description);

          return (
            <div
              key={kpi.id}
              className="card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onKPIClick(kpi.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{kpi.name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[kpi.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {kpi.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {kpi.ownership && (
                      <div>
                        <span className="text-gray-600">Ownership:</span>{' '}
                        <span className="font-semibold">{kpi.ownership}</span>
                      </div>
                    )}
                    {fields.Goal && (
                      <div>
                        <span className="text-gray-600">Goal:</span>{' '}
                        <span className="font-semibold">{fields.Goal}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Frequency:</span>{' '}
                      <span className="font-semibold capitalize">{kpi.frequency}</span>
                    </div>
                    {kpi.persons_responsible && kpi.persons_responsible.length > 0 && (
                      <div>
                        <span className="text-gray-600">Team:</span>{' '}
                        <span className="font-semibold">{kpi.persons_responsible.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => onKPIDelete(e, kpi.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete KPI"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // COMPACT VIEW (Table-like)
  if (viewMode === 'compact') {
    return (
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ownership
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kpis.map((kpi: any) => {
                const StatusIcon = statusIcons[kpi.status as keyof typeof statusIcons] || AlertCircle;
                const fields = parseFields(kpi.description);

                return (
                  <tr
                    key={kpi.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onKPIClick(kpi.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{kpi.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[kpi.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {kpi.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {kpi.ownership || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {fields.Goal || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {kpi.frequency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => onKPIDelete(e, kpi.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete KPI"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
