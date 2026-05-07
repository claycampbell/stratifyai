import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowRight, ListChecks } from 'lucide-react';
import api from '@/lib/api';

// Per backlog tickets PA-1 + PA-2: surfaces a per-user "what needs my attention right now"
// list and a per-area health rollup. Drop-in usable on any role dashboard. Backend computes
// the ranking in /api/dashboard/priority-actions and area rollup in /api/dashboard/area-health.

interface PriorityActionsListProps {
  userId?: string | null;
  userName?: string | null;
  limit?: number;
  className?: string;
}

interface PriorityAction {
  source: 'plan_item' | 'kpi' | 'validation';
  severity: 'red' | 'yellow' | 'green';
  entity_id: string;
  title: string;
  subtitle: string;
  link: string;
  due_date?: string;
}

interface AreaHealth {
  area: string;
  severity: 'red' | 'yellow' | 'green';
  total_kpis: number;
  on_track: number;
  at_risk: number;
  off_track: number;
}

const severityClass = (severity: 'red' | 'yellow' | 'green') => {
  switch (severity) {
    case 'red':
      return { dot: 'bg-red-500', border: 'border-l-red-500', text: 'text-red-700' };
    case 'yellow':
      return { dot: 'bg-yellow-500', border: 'border-l-yellow-500', text: 'text-yellow-700' };
    case 'green':
    default:
      return { dot: 'bg-green-500', border: 'border-l-green-500', text: 'text-green-700' };
  }
};

export default function PriorityActionsList({
  userId,
  userName,
  limit = 7,
  className = '',
}: PriorityActionsListProps) {
  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['priority-actions', userId, userName, limit],
    queryFn: () =>
      api
        .get('/dashboard/priority-actions', {
          params: { user_id: userId, user_name: userName, limit },
        })
        .then((res) => res.data),
    enabled: !!userId || !!userName,
    refetchInterval: 60000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['area-health', userName],
    queryFn: () =>
      api
        .get('/dashboard/area-health', { params: { user_name: userName } })
        .then((res) => res.data),
    enabled: !!userName,
    refetchInterval: 60000,
  });

  const actions: PriorityAction[] = actionsData?.items || [];
  const areas: AreaHealth[] = healthData?.areas || [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Area health rollup (PA-1) */}
      {areas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-gray-500" />
            Areas of responsibility
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {areas.map((a) => {
              const cls = severityClass(a.severity);
              return (
                <div
                  key={a.area}
                  className={`flex items-center gap-2 px-3 py-2 rounded border-l-4 bg-gray-50 ${cls.border}`}
                  title={`${a.on_track} on track · ${a.at_risk} at risk · ${a.off_track} off track`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${cls.dot}`} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{a.area}</div>
                    <div className="text-xs text-gray-500">
                      {a.total_kpis} KPI{a.total_kpis === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority Actions list (PA-2) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500" />
            Priority Actions
          </h3>
          {!actionsLoading && actions.length > 0 && (
            <span className="text-xs text-gray-500">
              Showing top {actions.length}
              {actionsData?.total_found > actions.length ? ` of ${actionsData.total_found}` : ''}
            </span>
          )}
        </div>

        {actionsLoading || healthLoading ? (
          <div className="text-sm text-gray-500 py-4 text-center">Loading…</div>
        ) : actions.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            Nothing flagged for your attention right now.
          </div>
        ) : (
          <ul className="space-y-2">
            {actions.map((item) => {
              const cls = severityClass(item.severity);
              return (
                <li key={`${item.source}-${item.entity_id}`}>
                  <Link
                    to={item.link}
                    className={`flex items-center gap-3 px-3 py-2 rounded border-l-4 hover:bg-gray-50 transition-colors ${cls.border}`}
                  >
                    <span className={`flex-shrink-0 inline-block w-2 h-2 rounded-full ${cls.dot}`} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                      <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
