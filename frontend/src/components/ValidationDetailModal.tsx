import { useQuery } from '@tanstack/react-query';
import { philosophyApi } from '@/lib/api';
import { ValidationDetail } from '@/types';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  User,
  Link2,
  TrendingUp,
  Target,
  ListChecks,
} from 'lucide-react';
import { format } from 'date-fns';

interface ValidationDetailModalProps {
  validationId: string;
  onClose: () => void;
}

/**
 * ValidationDetailModal
 *
 * V-1 / V-2: Shows full detail for a recommendation validation, including:
 * - actor (chat_history.user_id resolved against users table, else "AI")
 * - validation status and recommendation text
 * - violated non-negotiables
 * - source-entity snapshot (KPI / OGSM / plan-item) or "no longer available"
 */
export default function ValidationDetailModal({
  validationId,
  onClose,
}: ValidationDetailModalProps) {
  const { data, isLoading, error } = useQuery<ValidationDetail>({
    queryKey: ['validation-detail', validationId],
    queryFn: () =>
      philosophyApi.getValidationDetail(validationId).then((res) => res.data),
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'flagged':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'flagged':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Validation Detail</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading…</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 py-4">
              Failed to load validation detail.
            </div>
          )}

          {data && (
            <div className="space-y-5">
              {/* Status */}
              <div className={`p-3 rounded-lg border ${getStatusColor(data.validation_status)}`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(data.validation_status)}
                  <span className="text-sm font-semibold capitalize">
                    {data.validation_status}
                  </span>
                  <span className="ml-auto text-xs text-gray-500">
                    {data.created_at
                      ? format(new Date(data.created_at), 'MMM d, yyyy h:mm a')
                      : ''}
                  </span>
                </div>
              </div>

              {/* Actor */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Actor
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{data.actor_name || 'AI'}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Recommendation
                </h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3">
                  {data.recommendation_text}
                </p>
              </div>

              {/* Violated Non-Negotiables */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Violated Non-Negotiables
                </h3>
                {data.violated_non_negotiables && data.violated_non_negotiables.length > 0 ? (
                  <ul className="space-y-2">
                    {data.violated_non_negotiables.map((nn) => (
                      <li
                        key={nn.id}
                        className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3"
                      >
                        <span className="text-xs font-semibold text-red-700 mt-0.5">
                          #{nn.rule_number}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {nn.title}
                            </span>
                            {nn.auto_reject && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-medium">
                                AUTO-REJECT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{nn.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No violations recorded.</p>
                )}
              </div>

              {/* Source Entity */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Source Entity
                </h3>
                {data.source_entity ? (
                  <SourceEntityBlock entity={data.source_entity} />
                ) : data.source_entity_type || data.source_entity_id ? (
                  <div className="text-sm text-gray-500 italic bg-gray-50 border border-gray-200 rounded p-3">
                    Source no longer available.
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic bg-gray-50 border border-gray-200 rounded p-3">
                    No source entity linked to this validation.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceEntityBlock({
  entity,
}: {
  entity: NonNullable<ValidationDetail['source_entity']>;
}) {
  if (entity.type === 'kpi') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900">KPI: {entity.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
          <div>
            <span className="text-gray-500">Current:</span>{' '}
            {entity.current_value ?? '—'}
            {entity.unit ? ` ${entity.unit}` : ''}
          </div>
          <div>
            <span className="text-gray-500">Target:</span>{' '}
            {entity.target_value ?? '—'}
            {entity.unit ? ` ${entity.unit}` : ''}
          </div>
        </div>
      </div>
    );
  }

  if (entity.type === 'ogsm_component') {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-gray-900">
            OGSM {entity.component_type ? `(${entity.component_type})` : ''}
          </span>
        </div>
        <p className="text-sm text-gray-700">{entity.title}</p>
      </div>
    );
  }

  if (entity.type === 'plan_item') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-gray-900">Plan Item</span>
        </div>
        <p className="text-sm text-gray-700 mb-1">{entity.title}</p>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {entity.timeframe && (
            <span>
              <span className="text-gray-500">Timeframe:</span> {entity.timeframe}
            </span>
          )}
          {entity.status && (
            <span>
              <span className="text-gray-500">Status:</span> {entity.status}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
