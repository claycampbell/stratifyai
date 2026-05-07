import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
} from 'lucide-react';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const VALID_DOC_TYPES = [
  'mission',
  'vision',
  'purpose',
  'value',
  'guiding_principle',
  'operating_principle',
  'theme',
] as const;

const ENFORCEMENT_TYPES: Array<NonNegotiable['enforcement_type']> = [
  'hard_constraint',
  'priority_rule',
  'operational_expectation',
];

function friendlyApiError(err: any, fallback: string): string {
  if (err?.response?.status === 403) {
    return "You don't have permission to make that change. Contact an administrator.";
  }
  return err?.response?.data?.error || err?.message || fallback;
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function PhilosophyManagement() {
  const queryClient = useQueryClient();

  // Modal state — only one editor open at a time
  const [docEditor, setDocEditor] = useState<
    | { mode: 'create'; defaultType?: PhilosophyDocument['type'] }
    | { mode: 'edit'; doc: PhilosophyDocument }
    | null
  >(null);
  const [ruleEditor, setRuleEditor] = useState<
    { mode: 'create' } | { mode: 'edit'; rule: NonNegotiable } | null
  >(null);
  const [hierarchyEditor, setHierarchyEditor] = useState<
    { mode: 'create' } | { mode: 'edit'; level: DecisionHierarchyLevel } | null
  >(null);

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

  // Mutations
  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => philosophyApi.deleteDocument(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['philosophy-documents'] }),
    onError: (err) => alert(friendlyApiError(err, 'Failed to delete document')),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => philosophyApi.deleteNonNegotiable(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['philosophy-non-negotiables'] }),
    onError: (err) => alert(friendlyApiError(err, 'Failed to delete non-negotiable')),
  });

  const deleteHierarchyMutation = useMutation({
    mutationFn: (id: string) => philosophyApi.deleteDecisionHierarchyLevel(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['philosophy-hierarchy'] }),
    onError: (err) => alert(friendlyApiError(err, 'Failed to delete hierarchy level')),
  });

  // Group documents by type
  const groupedDocs = documents?.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, PhilosophyDocument[]>) || {};

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

  const getPriorityColor = (weight: number) => {
    if (weight >= 90) return 'bg-red-500';
    if (weight >= 70) return 'bg-orange-500';
    if (weight >= 50) return 'bg-yellow-500';
    if (weight >= 30) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    mission: { label: 'Mission', icon: Target, color: 'text-blue-600' },
    vision: { label: 'Vision', icon: TrendingUp, color: 'text-purple-600' },
    purpose: { label: 'Purpose', icon: Compass, color: 'text-green-600' },
    value: { label: 'Core Values', icon: Heart, color: 'text-red-600' },
    guiding_principle: { label: 'Guiding Principles', icon: Award, color: 'text-indigo-600' },
    operating_principle: { label: 'Operating Principles', icon: Settings, color: 'text-gray-600' },
    theme: { label: 'Department Themes', icon: Flag, color: 'text-orange-600' },
  };

  const handleDeleteDoc = (doc: PhilosophyDocument) => {
    if (confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
      deleteDocMutation.mutate(doc.id);
    }
  };
  const handleDeleteRule = (rule: NonNegotiable) => {
    if (confirm(`Delete non-negotiable "#${rule.rule_number} ${rule.title}"?`)) {
      deleteRuleMutation.mutate(rule.id);
    }
  };
  const handleDeleteLevel = (level: DecisionHierarchyLevel) => {
    if (confirm(`Delete hierarchy level "${level.stakeholder}"?`)) {
      deleteHierarchyMutation.mutate(level.id);
    }
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RMU Athletics Philosophy</h1>
          <p className="mt-2 text-gray-600">
            View and manage organizational philosophy documents, core values, and non-negotiable rules
          </p>
        </div>
      </div>

      {/* Mission & Vision Section */}
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Mission & Vision</h2>
          <button
            onClick={() => setDocEditor({ mode: 'create', defaultType: 'mission' })}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Document
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(['mission', 'vision', 'purpose'] as const).map((type) => {
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
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onEdit={() => setDocEditor({ mode: 'edit', doc })}
                        onDelete={() => handleDeleteDoc(doc)}
                      />
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
          <button
            onClick={() => setDocEditor({ mode: 'create', defaultType: 'value' })}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Value
          </button>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-600">
                      {doc.priority_weight}
                    </span>
                    <RowActions
                      onEdit={() => setDocEditor({ mode: 'edit', doc })}
                      onDelete={() => handleDeleteDoc(doc)}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{doc.content}</p>
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
          {(['guiding_principle', 'operating_principle', 'theme'] as const).map((type) => {
            const docs = groupedDocs[type] || [];
            const config = typeConfig[type];
            const Icon = config.icon;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                  <button
                    onClick={() => setDocEditor({ mode: 'create', defaultType: type })}
                    className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-3">
                  {docs.length > 0 ? (
                    docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{doc.title}</h4>
                          <RowActions
                            onEdit={() => setDocEditor({ mode: 'edit', doc })}
                            onDelete={() => handleDeleteDoc(doc)}
                          />
                        </div>
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
          <h2 className="text-2xl font-semibold text-gray-900">Non-Negotiables</h2>
          <span className="ml-auto text-sm text-gray-600">
            {nonNegotiables?.length || 0} rules defined
          </span>
          <button
            onClick={() => setRuleEditor({ mode: 'create' })}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        </div>
        <div className="space-y-3">
          {(nonNegotiables || [])
            .slice()
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
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{rule.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {rule.auto_reject ? (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Auto-Reject
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            Flag Only
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getEnforcementBadge(
                            rule.enforcement_type
                          )}`}
                        >
                          {rule.enforcement_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <RowActions
                          onEdit={() => setRuleEditor({ mode: 'edit', rule })}
                          onDelete={() => handleDeleteRule(rule)}
                        />
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
          <button
            onClick={() => setHierarchyEditor({ mode: 'create' })}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Level
          </button>
        </div>

        <div className="flex flex-col items-center space-y-4 py-8">
          {(hierarchy || [])
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((level, idx, arr) => {
              const icons = [Building, Users, User];
              const Icon = icons[idx] || User;
              const colors = [
                'bg-red-100 border-red-300 text-red-800',
                'bg-yellow-100 border-yellow-300 text-yellow-800',
                'bg-green-100 border-green-300 text-green-800',
              ];
              const widthPercent = 40 + (arr.length - idx) * 20;

              return (
                <div
                  key={level.id}
                  className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${colors[idx % colors.length]}`}
                  style={{ width: `${widthPercent}%`, maxWidth: '600px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h3 className="text-lg font-bold">Level {level.level}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Weight: {level.weight}%</span>
                          <RowActions
                            onEdit={() => setHierarchyEditor({ mode: 'edit', level })}
                            onDelete={() => handleDeleteLevel(level)}
                          />
                        </div>
                      </div>
                      <h4 className="font-semibold mb-1">{level.stakeholder}</h4>
                      {level.description && (
                        <p className="text-sm opacity-90">{level.description}</p>
                      )}
                    </div>
                  </div>
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

      {/* Editors */}
      {docEditor && (
        <PhilosophyDocumentEditor
          mode={docEditor.mode}
          existing={docEditor.mode === 'edit' ? docEditor.doc : undefined}
          defaultType={docEditor.mode === 'create' ? docEditor.defaultType : undefined}
          onClose={() => setDocEditor(null)}
        />
      )}
      {ruleEditor && (
        <NonNegotiableEditor
          mode={ruleEditor.mode}
          existing={ruleEditor.mode === 'edit' ? ruleEditor.rule : undefined}
          existingRuleNumbers={(nonNegotiables || []).map((n) => n.rule_number)}
          onClose={() => setRuleEditor(null)}
        />
      )}
      {hierarchyEditor && (
        <DecisionHierarchyEditor
          mode={hierarchyEditor.mode}
          existing={hierarchyEditor.mode === 'edit' ? hierarchyEditor.level : undefined}
          onClose={() => setHierarchyEditor(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Cards / Inline UI helpers
// ----------------------------------------------------------------------------

function DocumentCard({
  doc,
  onEdit,
  onDelete,
}: {
  doc: PhilosophyDocument;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900">{doc.title}</h4>
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{doc.content}</p>
      {doc.category && (
        <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
          {doc.category}
        </span>
      )}
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded hover:bg-red-100 text-red-600"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Modal shell
// ----------------------------------------------------------------------------

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Editor: PhilosophyDocument
// ----------------------------------------------------------------------------

function PhilosophyDocumentEditor({
  mode,
  existing,
  defaultType,
  onClose,
}: {
  mode: 'create' | 'edit';
  existing?: PhilosophyDocument;
  defaultType?: PhilosophyDocument['type'];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: existing?.type ?? defaultType ?? 'mission',
    category: existing?.category ?? '',
    title: existing?.title ?? '',
    content: existing?.content ?? '',
    priority_weight: existing?.priority_weight ?? 50,
    is_active: existing?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        category: form.category || null,
        title: form.title,
        content: form.content,
        priority_weight: Number(form.priority_weight),
        is_active: form.is_active,
      };
      if (mode === 'edit' && existing) {
        return philosophyApi.updateDocument(existing.id, payload);
      }
      return philosophyApi.createDocument(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['philosophy-documents'] });
      onClose();
    },
    onError: (err) => alert(friendlyApiError(err, 'Failed to save document')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      alert('Title and content are required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <ModalShell
      title={mode === 'edit' ? 'Edit Philosophy Document' : 'New Philosophy Document'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="philosophy-doc-form"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="philosophy-doc-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as PhilosophyDocument['type'] })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {VALID_DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={form.category || ''}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="e.g. Community"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={5}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority Weight: {form.priority_weight}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.priority_weight}
            onChange={(e) => setForm({ ...form, priority_weight: Number(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher = more weight in AI prompts (0–100).
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded"
          />
          Active (used in AI context)
        </label>
      </form>
    </ModalShell>
  );
}

// ----------------------------------------------------------------------------
// Editor: NonNegotiable
// ----------------------------------------------------------------------------

function NonNegotiableEditor({
  mode,
  existing,
  existingRuleNumbers,
  onClose,
}: {
  mode: 'create' | 'edit';
  existing?: NonNegotiable;
  existingRuleNumbers: number[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const nextRuleNumber = Math.max(0, ...existingRuleNumbers) + 1;
  const [form, setForm] = useState({
    rule_number: existing?.rule_number ?? nextRuleNumber,
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    enforcement_type: (existing?.enforcement_type ?? 'operational_expectation') as NonNegotiable['enforcement_type'],
    auto_reject: existing?.auto_reject ?? false,
    validation_keywords: (existing?.validation_keywords ?? []).join(', '),
    is_active: existing?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const keywords = form.validation_keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        rule_number: Number(form.rule_number),
        title: form.title,
        description: form.description,
        enforcement_type: form.enforcement_type,
        auto_reject: form.auto_reject,
        validation_keywords: keywords,
        is_active: form.is_active,
      };
      if (mode === 'edit' && existing) {
        return philosophyApi.updateNonNegotiable(existing.id, payload);
      }
      return philosophyApi.createNonNegotiable(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['philosophy-non-negotiables'] });
      onClose();
    },
    onError: (err) => alert(friendlyApiError(err, 'Failed to save non-negotiable')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('Title and description are required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <ModalShell
      title={mode === 'edit' ? 'Edit Non-Negotiable' : 'New Non-Negotiable'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="non-negotiable-form"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="non-negotiable-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule #</label>
            <input
              type="number"
              min={1}
              value={form.rule_number}
              onChange={(e) => setForm({ ...form, rule_number: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enforcement Type
            </label>
            <select
              value={form.enforcement_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  enforcement_type: e.target.value as NonNegotiable['enforcement_type'],
                })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {ENFORCEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validation Keywords <span className="text-gray-400">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={form.validation_keywords}
            onChange={(e) => setForm({ ...form, validation_keywords: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="silo, individual program, department first"
          />
          <p className="text-xs text-gray-500 mt-1">
            Words/phrases the validator scans for in AI recommendations.
          </p>
        </div>

        {/* V-3: auto_reject toggle with helper copy */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_reject}
              onChange={(e) => setForm({ ...form, auto_reject: e.target.checked })}
              className="mt-1 rounded"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {form.auto_reject ? 'Auto-reject (hard block)' : 'Flag only (warning)'}
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                <strong>Auto-reject:</strong> hard-block any AI recommendation that
                violates this rule. Use only for objectively-evaluable rules.
              </p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                <strong>Flag only:</strong> surface as a warning for human review.
                Use for subjective rules.
              </p>
            </div>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded"
          />
          Active (enforced by validator)
        </label>
      </form>
    </ModalShell>
  );
}

// ----------------------------------------------------------------------------
// Editor: DecisionHierarchyLevel
// ----------------------------------------------------------------------------

function DecisionHierarchyEditor({
  mode,
  existing,
  onClose,
}: {
  mode: 'create' | 'edit';
  existing?: DecisionHierarchyLevel;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    level: existing?.level ?? 1,
    stakeholder: existing?.stakeholder ?? '',
    description: existing?.description ?? '',
    weight: existing?.weight ?? 50,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        level: Number(form.level),
        stakeholder: form.stakeholder,
        description: form.description || null,
        weight: Number(form.weight),
      };
      if (mode === 'edit' && existing) {
        return philosophyApi.updateDecisionHierarchyLevel(existing.id, payload);
      }
      return philosophyApi.createDecisionHierarchyLevel(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['philosophy-hierarchy'] });
      onClose();
    },
    onError: (err) => alert(friendlyApiError(err, 'Failed to save hierarchy level')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stakeholder.trim()) {
      alert('Stakeholder is required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <ModalShell
      title={mode === 'edit' ? 'Edit Decision Hierarchy Level' : 'New Decision Hierarchy Level'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="hierarchy-form"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="hierarchy-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <input
              type="number"
              min={1}
              value={form.level}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Lower number = higher priority.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight: {form.weight}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholder</label>
          <input
            type="text"
            value={form.stakeholder}
            onChange={(e) => setForm({ ...form, stakeholder: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="e.g. University"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </form>
    </ModalShell>
  );
}
