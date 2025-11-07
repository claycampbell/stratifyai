import { useQuery } from '@tanstack/react-query';
import { philosophyApi } from '@/lib/api';
import { CheckCircle, AlertTriangle, XCircle, Clock, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * RecentValidations
 *
 * Dashboard widget that displays recent AI recommendation validations.
 * Shows validation status (approved/flagged/rejected) and which non-negotiables
 * were involved in the validation.
 *
 * Part of P0-006 Phase 2: RMU Athletics Philosophy Integration - Dashboard Widgets
 */
export default function RecentValidations() {
  const { data: validations, isLoading, error } = useQuery({
    queryKey: ['recent-validations'],
    queryFn: () => philosophyApi.getRecentValidations(5).then((res) => res.data),
    refetchInterval: 60000, // Refetch every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'flagged':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'flagged':
        return 'bg-yellow-50 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-900';
      case 'flagged':
        return 'text-yellow-900';
      case 'rejected':
        return 'text-red-900';
      default:
        return 'text-gray-900';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading validations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Validations</h2>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-red-600">Failed to load validations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Recent Validations</h2>
      </div>

      {/* Validations List */}
      {validations && validations.length > 0 ? (
        <div className="space-y-3">
          {validations.map((validation: any) => (
            <div
              key={validation.id}
              className={`p-3 rounded-lg border ${getStatusColor(validation.validation_status)}`}
            >
              {/* Status and Time */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(validation.validation_status)}
                  <span className={`text-sm font-medium capitalize ${getStatusTextColor(validation.validation_status)}`}>
                    {validation.validation_status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(validation.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              {/* Validation Summary */}
              <p className="text-sm text-gray-700 mb-2">
                {validation.validation_status === 'approved' && (
                  'AI recommendation validated and aligned with RMU Athletics philosophy and non-negotiables.'
                )}
                {validation.validation_status === 'rejected' && (
                  `AI recommendation rejected due to ${validation.violated_non_negotiables?.length || 0} non-negotiable violation${validation.violated_non_negotiables?.length !== 1 ? 's' : ''}.`
                )}
                {validation.validation_status === 'flagged' && (
                  `AI recommendation flagged for review due to ${validation.violated_non_negotiables?.length || 0} potential concern${validation.violated_non_negotiables?.length !== 1 ? 's' : ''}.`
                )}
              </p>

              {/* Violated Non-Negotiables */}
              {validation.violated_non_negotiables && validation.violated_non_negotiables.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">Violated Non-Negotiables:</p>
                  <div className="space-y-1">
                    {validation.violated_non_negotiables.map((nn: any) => (
                      <div key={nn.id} className="flex items-start gap-1.5">
                        <span className="text-xs text-red-600 font-medium">#{nn.rule_number}</span>
                        <span className="text-xs text-gray-600 line-clamp-1">{nn.title}</span>
                        {nn.auto_reject && (
                          <span className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                            AUTO-REJECT
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Status Note */}
              {validation.validation_status === 'approved' && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs text-green-700 italic">
                    Recommendation aligns with all non-negotiables
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No validations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            AI recommendations will appear here after validation
          </p>
        </div>
      )}
    </div>
  );
}
