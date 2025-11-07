import { useQuery } from '@tanstack/react-query';
import { philosophyApi } from '@/lib/api';
import { PhilosophyDocument, NonNegotiable, DecisionHierarchyLevel } from '@/types';
import {
  BookOpen,
  Target,
  Heart,
  Compass,
  Settings,
  Flag,
  ShieldAlert,
  AlertTriangle,
  Award,
  TrendingUp,
  Users,
  Building,
  User,
} from 'lucide-react';

export default function PhilosophyManagement() {

  // Fetch philosophy documents
  const { data: documents, isLoading: docsLoading } = useQuery<PhilosophyDocument[]>({
    queryKey: ['philosophy-documents'],
    queryFn: () => philosophyApi.getDocuments().then((res) => res.data),
  });

  // Fetch non-negotiables
  const { data: nonNegotiables, isLoading: rulesLoading } = useQuery<NonNegotiable[]>({
    queryKey: ['philosophy-non-negotiables'],
    queryFn: () => philosophyApi.getNonNegotiables().then((res) => res.data),
  });

  // Fetch decision hierarchy
  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery<DecisionHierarchyLevel[]>({
    queryKey: ['philosophy-hierarchy'],
    queryFn: () => philosophyApi.getDecisionHierarchy().then((res) => res.data),
  });

  // Group documents by type
  const groupedDocs = documents?.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = [];
    }
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, PhilosophyDocument[]>) || {};

  // Get enforcement type badge color
  const getEnforcementBadge = (type: string) => {
    switch (type) {
      case 'hard_constraint':
        return 'bg-red-100 text-red-800';
      case 'priority_rule':
        return 'bg-yellow-100 text-yellow-800';
      case 'operational_expectation':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority weight bar color
  const getPriorityColor = (weight: number) => {
    if (weight >= 90) return 'bg-red-500';
    if (weight >= 70) return 'bg-orange-500';
    if (weight >= 50) return 'bg-yellow-500';
    if (weight >= 30) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  // Type display config
  const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    mission: { label: 'Mission', icon: Target, color: 'text-blue-600' },
    vision: { label: 'Vision', icon: TrendingUp, color: 'text-purple-600' },
    purpose: { label: 'Purpose', icon: Compass, color: 'text-green-600' },
    value: { label: 'Core Values', icon: Heart, color: 'text-red-600' },
    guiding_principle: { label: 'Guiding Principles', icon: Award, color: 'text-indigo-600' },
    operating_principle: { label: 'Operating Principles', icon: Settings, color: 'text-gray-600' },
    theme: { label: 'Department Themes', icon: Flag, color: 'text-orange-600' },
  };

  if (docsLoading || rulesLoading || hierarchyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">RMU Athletics Philosophy</h1>
        <p className="mt-2 text-gray-600">
          View and manage organizational philosophy documents, core values, and non-negotiable rules
        </p>
      </div>

      {/* Mission & Vision Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Mission & Vision</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['mission', 'vision', 'purpose'].map((type) => {
            const docs = groupedDocs[type] || [];
            const config = typeConfig[type];
            const Icon = config.icon;

            return (
              <div key={type} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                  <span className="ml-auto text-sm text-gray-500">{docs.length} items</span>
                </div>
                <div className="space-y-3">
                  {docs.length > 0 ? (
                    docs.map((doc) => (
                      <div key={doc.id} className="bg-white p-4 rounded-md border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">{doc.title}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{doc.content}</p>
                        {doc.category && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {doc.category}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No {config.label.toLowerCase()} defined</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Values Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-6 w-6 text-red-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Core Values</h2>
          <span className="ml-auto text-sm text-gray-600">
            {groupedDocs['value']?.length || 0} values
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groupedDocs['value'] || [])
            .sort((a, b) => b.priority_weight - a.priority_weight)
            .map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{doc.title}</h3>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                    {doc.priority_weight}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{doc.content}</p>

                {/* Priority Weight Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Priority Weight</span>
                    <span>{doc.priority_weight}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getPriorityColor(doc.priority_weight)}`}
                      style={{ width: `${doc.priority_weight}%` }}
                    />
                  </div>
                </div>

                {doc.category && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Category: {doc.category}</span>
                  </div>
                )}
              </div>
            ))}
        </div>
      </section>

      {/* Guiding & Operating Principles Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <Award className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Principles & Themes</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {['guiding_principle', 'operating_principle', 'theme'].map((type) => {
            const docs = groupedDocs[type] || [];
            const config = typeConfig[type];
            const Icon = config.icon;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                </div>
                <div className="space-y-3">
                  {docs.length > 0 ? (
                    docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{doc.title}</h4>
                        <p className="text-sm text-gray-600">{doc.content}</p>
                        {doc.priority_weight > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${getPriorityColor(doc.priority_weight)}`}
                                style={{ width: `${doc.priority_weight}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{doc.priority_weight}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No {config.label.toLowerCase()} defined</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Non-Negotiables Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="h-6 w-6 text-red-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Non-Negotiables (12 Rules)</h2>
          <span className="ml-auto text-sm text-gray-600">
            {nonNegotiables?.length || 0} rules defined
          </span>
        </div>
        <div className="space-y-3">
          {(nonNegotiables || [])
            .sort((a, b) => a.rule_number - b.rule_number)
            .map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-5 ${
                  rule.auto_reject
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-700">{rule.rule_number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{rule.title}</h3>
                      <div className="flex items-center gap-2">
                        {rule.auto_reject && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Auto-Reject
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getEnforcementBadge(
                            rule.enforcement_type
                          )}`}
                        >
                          {rule.enforcement_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{rule.description}</p>
                    {rule.validation_keywords && rule.validation_keywords.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Keywords:</span>
                        {rule.validation_keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Decision Hierarchy Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Decision Hierarchy</h2>
          <span className="ml-auto text-sm text-gray-600">
            {hierarchy?.length || 0} levels
          </span>
        </div>

        {/* Pyramid Visualization */}
        <div className="flex flex-col items-center space-y-4 py-8">
          {(hierarchy || [])
            .sort((a, b) => a.level - b.level)
            .map((level, idx, arr) => {
              const icons = [Building, Users, User];
              const Icon = icons[idx] || User;
              const colors = [
                'bg-red-100 border-red-300 text-red-800',
                'bg-yellow-100 border-yellow-300 text-yellow-800',
                'bg-green-100 border-green-300 text-green-800',
              ];

              // Calculate width based on inverse level (top is narrower)
              const widthPercent = 40 + (arr.length - idx) * 20;

              return (
                <div
                  key={level.id}
                  className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${colors[idx]}`}
                  style={{ width: `${widthPercent}%`, maxWidth: '600px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold">Level {level.level}</h3>
                        <span className="text-sm font-medium">Weight: {level.weight}%</span>
                      </div>
                      <h4 className="font-semibold mb-1">{level.stakeholder}</h4>
                      {level.description && (
                        <p className="text-sm opacity-90">{level.description}</p>
                      )}
                    </div>
                  </div>
                  {/* Weight Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-current opacity-70"
                        style={{ width: `${level.weight}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{hierarchy?.length || 0}</div>
            <div className="text-sm text-gray-600">Hierarchy Levels</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(hierarchy || []).reduce((sum, h) => sum + h.weight, 0)}%
            </div>
            <div className="text-sm text-gray-600">Total Weight</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {nonNegotiables?.filter((n) => n.auto_reject).length || 0}
            </div>
            <div className="text-sm text-gray-600">Auto-Reject Rules</div>
          </div>
        </div>
      </section>

      {/* Summary Statistics */}
      <section className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Philosophy Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{documents?.length || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Philosophy Documents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {groupedDocs['value']?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Core Values</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{nonNegotiables?.length || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Non-Negotiables</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{hierarchy?.length || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Decision Levels</div>
          </div>
        </div>
      </section>
    </div>
  );
}
