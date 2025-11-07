import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { staffPlansApi, planItemsApi, planLinksApi } from '@/lib/api';
import { PlanItem } from '@/types';
import { ArrowLeft, Plus, Calendar, CheckCircle, Clock, AlertCircle, Circle, X, Link as LinkIcon, TrendingUp, Target, Layers } from 'lucide-react';
import LinkPicker from '@/components/LinkPicker';
import PlanItemDetailModal from '@/components/PlanItemDetailModal';

export default function StaffPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30_days');
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [selectedItemForLinking, setSelectedItemForLinking] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<PlanItem | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['staff-plan', id],
    queryFn: () => staffPlansApi.getById(id!).then((res) => res.data),
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ['plan-items', id],
    queryFn: () => staffPlansApi.getItems(id!).then((res) => res.data),
    enabled: !!id,
  });

  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    timeframe: '30_days',
    priority: 'medium',
    status: 'not_started',
  });

  const createItemMutation = useMutation({
    mutationFn: (data: any) => planItemsApi.create({ ...data, plan_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items', id] });
      setIsCreatingItem(false);
      setNewItem({
        title: '',
        description: '',
        timeframe: '30_days',
        priority: 'medium',
        status: 'not_started',
      });
    },
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      planItemsApi.update(itemId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items', id] });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: (data: { plan_item_id: string; link_type: string; link_id: string }) =>
      planLinksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-item-links'] });
      setShowLinkPicker(false);
      setSelectedItemForLinking(null);
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => planLinksApi.delete(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-item-links'] });
    },
  });

  // Fetch all links for items (we'll fetch links for all items in the plan)
  const { data: allLinks } = useQuery({
    queryKey: ['plan-item-links', id],
    queryFn: async () => {
      if (!items || items.length === 0) return [];
      const linkPromises = items.map((item: PlanItem) =>
        planItemsApi.getLinks(item.id).then((res) => ({ itemId: item.id, links: res.data }))
      );
      return Promise.all(linkPromises);
    },
    enabled: !!items && items.length > 0,
  });

  const getLinksForItem = (itemId: string) => {
    const itemLinks = allLinks?.find((l: any) => l.itemId === itemId);
    return itemLinks?.links || [];
  };

  const handleAddLink = (itemId: string) => {
    setSelectedItemForLinking(itemId);
    setShowLinkPicker(true);
  };

  const handleLinkSelect = (entity: any) => {
    if (selectedItemForLinking) {
      createLinkMutation.mutate({
        plan_item_id: selectedItemForLinking,
        link_type: entity.type,
        link_id: entity.id,
      });
    }
  };

  const handleRemoveLink = (linkId: string) => {
    if (confirm('Remove this link?')) {
      deleteLinkMutation.mutate(linkId);
    }
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate(newItem);
  };

  const filterItemsByTimeframe = (timeframe: string) => {
    return items?.filter((item: PlanItem) => item.timeframe === timeframe) || [];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'not_started':
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'blocked':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'not_started':
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLinkIcon = (linkType: string) => {
    switch (linkType) {
      case 'kpi':
      case 'measure':
        return <TrendingUp className="h-3 w-3" />;
      case 'strategy':
      case 'objective':
      case 'goal':
        return <Target className="h-3 w-3" />;
      case 'initiative':
        return <Layers className="h-3 w-3" />;
      default:
        return <LinkIcon className="h-3 w-3" />;
    }
  };

  const getLinkColor = (linkType: string) => {
    switch (linkType) {
      case 'kpi':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'strategy':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'objective':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'goal':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'measure':
        return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'initiative':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Plan not found</h2>
          <button
            onClick={() => navigate('/staff-plans')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  const timeframes = [
    { key: '30_days', label: '30 Days', items: filterItemsByTimeframe('30_days') },
    { key: '60_days', label: '60 Days', items: filterItemsByTimeframe('60_days') },
    { key: '90_days', label: '90 Days', items: filterItemsByTimeframe('90_days') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <button
        onClick={() => navigate('/staff-plans')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Plans
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{plan.title}</h1>
        {plan.description && <p className="text-gray-600 mb-4">{plan.description}</p>}

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(plan.start_date).toLocaleDateString()} -{' '}
              {new Date(plan.end_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium">Status:</span> {plan.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Timeframe Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setSelectedTimeframe(tf.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTimeframe === tf.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tf.label}
              <span className="ml-2 text-xs text-gray-400">({tf.items.length})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Action Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsCreatingItem(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filterItemsByTimeframe(selectedTimeframe).map((item: PlanItem) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition-colors ${getStatusColor(item.status)}`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() =>
                  updateItemStatusMutation.mutate({
                    itemId: item.id,
                    status: item.status === 'completed' ? 'not_started' : 'completed',
                  })
                }
                className="mt-1"
              >
                {getStatusIcon(item.status)}
              </button>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setSelectedItemForDetail(item)}
                    className="text-left hover:text-primary-600 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 hover:underline">{item.title}</h3>
                  </button>
                  <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Status: {item.status.replace('_', ' ')}</span>
                  {item.completion_percentage > 0 && (
                    <span>{item.completion_percentage}% complete</span>
                  )}
                </div>

                {/* Strategic Links */}
                {getLinksForItem(item.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Strategic Links:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getLinksForItem(item.id).map((link: any) => (
                        <div
                          key={link.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${getLinkColor(link.link_type)}`}
                        >
                          {getLinkIcon(link.link_type)}
                          <span className="capitalize">{link.link_type}</span>
                          <button
                            onClick={() => handleRemoveLink(link.id)}
                            className="ml-1 hover:text-red-600"
                            title="Remove link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Link Button */}
                <div className="mt-3">
                  <button
                    onClick={() => handleAddLink(item.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <LinkIcon className="h-3 w-3" />
                    Link Strategy/KPI
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filterItemsByTimeframe(selectedTimeframe).length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No items in this timeframe yet</p>
          </div>
        )}
      </div>

      {/* Create Item Modal */}
      {isCreatingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Add Plan Item</h2>
              <button
                onClick={() => setIsCreatingItem(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
                  <select
                    value={newItem.timeframe}
                    onChange={(e) => setNewItem({ ...newItem, timeframe: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="30_days">30 Days</option>
                    <option value="60_days">60 Days</option>
                    <option value="90_days">90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Picker Modal */}
      {showLinkPicker && (
        <LinkPicker
          onSelect={handleLinkSelect}
          onClose={() => {
            setShowLinkPicker(false);
            setSelectedItemForLinking(null);
          }}
          excludeIds={selectedItemForLinking ? getLinksForItem(selectedItemForLinking).map((l: any) => l.link_id) : []}
        />
      )}

      {/* Plan Item Detail Modal */}
      {selectedItemForDetail && (
        <PlanItemDetailModal
          item={selectedItemForDetail}
          onClose={() => setSelectedItemForDetail(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['plan-items', id] });
            queryClient.invalidateQueries({ queryKey: ['staff-plan', id] });
          }}
        />
      )}
    </div>
  );
}
