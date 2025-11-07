import { useQuery } from '@tanstack/react-query';
import { philosophyApi } from '@/lib/api';
import { Heart, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * PhilosophyQuickReference
 *
 * Dashboard widget that displays core values at a glance with quick access
 * to the full philosophy page. Shows current non-negotiables count.
 *
 * Part of P0-006 Phase 2: RMU Athletics Philosophy Integration - Dashboard Widgets
 */
export default function PhilosophyQuickReference() {
  const { data: philosophy, isLoading: philosophyLoading } = useQuery({
    queryKey: ['philosophy-documents'],
    queryFn: () => philosophyApi.getDocuments().then((res) => res.data),
  });

  const { data: nonNegotiables, isLoading: nonNegotiablesLoading } = useQuery({
    queryKey: ['non-negotiables'],
    queryFn: () => philosophyApi.getNonNegotiables().then((res) => res.data),
  });

  const isLoading = philosophyLoading || nonNegotiablesLoading;

  // Filter core values
  const coreValues = philosophy?.filter((doc: any) => doc.type === 'value') || [];
  const mission = philosophy?.find((doc: any) => doc.type === 'mission');
  const nonNegotiableCount = nonNegotiables?.length || 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading philosophy...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">RMU Athletics Philosophy</h2>
        </div>
        <Link
          to="/philosophy"
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          <span>View Full</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* Mission Statement (if available) */}
      {mission && (
        <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-sm font-medium text-primary-900 mb-1">Mission</p>
          <p className="text-xs text-primary-700 line-clamp-2">{mission.content}</p>
        </div>
      )}

      {/* Core Values */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Core Values</h3>
        {coreValues.length > 0 ? (
          <div className="space-y-2">
            {coreValues.slice(0, 3).map((value: any) => (
              <div key={value.id} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{value.category || value.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-1">{value.content}</p>
                </div>
              </div>
            ))}
            {coreValues.length > 3 && (
              <p className="text-xs text-gray-500 italic pl-4">
                +{coreValues.length - 3} more values
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No core values defined yet</p>
        )}
      </div>

      {/* Non-Negotiables Count */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-700">Non-Negotiables</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{nonNegotiableCount}</span>
            <span className="text-xs text-gray-500">rules</span>
          </div>
        </div>
        {nonNegotiableCount > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Active constraints guiding all recommendations
          </p>
        )}
      </div>
    </div>
  );
}
