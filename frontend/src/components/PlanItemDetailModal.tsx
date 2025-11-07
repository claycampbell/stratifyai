import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planItemsApi } from '@/lib/api';
import { PlanItem, PlanUpdate } from '@/types';
import {
  X,
  Calendar,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Circle,
  Edit2,
  Save,
  XCircle,
} from 'lucide-react';

interface PlanItemDetailModalProps {
  item: PlanItem;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PlanItemDetailModal({ item, onClose, onUpdate }: PlanItemDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: item.title,
    description: item.description || '',
    priority: item.priority,
    status: item.status,
    completion_percentage: item.completion_percentage,
    target_completion_date: item.target_completion_date || '',
    notes: item.notes || '',
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    update_type: 'progress_update' as const,
    notes: '',
    new_value: '',
  });

  // Fetch update history
  const { data: updates } = useQuery({
    queryKey: ['plan-updates', item.id],
    queryFn: () => planItemsApi.getUpdates(item.id).then((res) => res.data),
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: (data: any) => planItemsApi.update(item.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['staff-plan'] });
      setIsEditing(false);
      onUpdate();
    },
  });

  // Create update mutation
  const createUpdateMutation = useMutation({
    mutationFn: (data: any) => planItemsApi.addUpdate(item.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-updates', item.id] });
      setShowUpdateForm(false);
      setUpdateForm({
        update_type: 'progress_update',
        notes: '',
        new_value: '',
      });
    },
  });

  const handleSaveEdit = () => {
    const previousStatus = item.status;
    const previousPercentage = item.completion_percentage;

    // Prepare update data
    const updateData: any = {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      status: editForm.status,
      completion_percentage: editForm.completion_percentage,
      target_completion_date: editForm.target_completion_date || null,
      notes: editForm.notes,
    };

    // Update the item
    updateItemMutation.mutate(updateData);

    // Create automatic update records for changes
    if (previousStatus !== editForm.status) {
      createUpdateMutation.mutate({
        update_type: 'status_change',
        previous_value: previousStatus,
        new_value: editForm.status,
        notes: `Status changed from ${previousStatus} to ${editForm.status}`,
      });
    }

    if (previousPercentage !== editForm.completion_percentage) {
      createUpdateMutation.mutate({
        update_type: 'progress_update',
        previous_value: previousPercentage.toString(),
        new_value: editForm.completion_percentage.toString(),
        notes: `Progress updated from ${previousPercentage}% to ${editForm.completion_percentage}%`,
      });
    }

    if (editForm.status === 'completed' && previousStatus !== 'completed') {
      createUpdateMutation.mutate({
        update_type: 'completion',
        notes: 'Item marked as completed',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      status: item.status,
      completion_percentage: item.completion_percentage,
      target_completion_date: item.target_completion_date || '',
      notes: item.notes || '',
    });
    setIsEditing(false);
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    createUpdateMutation.mutate(updateForm);
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

  const getUpdateTypeIcon = (updateType: string) => {
    switch (updateType) {
      case 'status_change':
        return <AlertCircle className="h-4 w-4" />;
      case 'progress_update':
        return <TrendingUp className="h-4 w-4" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4" />;
      case 'blocked':
        return <XCircle className="h-4 w-4" />;
      case 'note_added':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getUpdateTypeColor = (updateType: string) => {
    switch (updateType) {
      case 'status_change':
        return 'text-blue-600 bg-blue-50';
      case 'progress_update':
        return 'text-green-600 bg-green-50';
      case 'completion':
        return 'text-green-600 bg-green-50';
      case 'blocked':
        return 'text-red-600 bg-red-50';
      case 'note_added':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {getStatusIcon(isEditing ? editForm.status : item.status)}
            <h2 className="text-xl font-bold">
              {isEditing ? 'Edit Plan Item' : 'Plan Item Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            /* Edit Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress: {editForm.completion_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.completion_percentage}
                    onChange={(e) => setEditForm({ ...editForm, completion_percentage: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Completion Date</label>
                <input
                  type="date"
                  value={editForm.target_completion_date}
                  onChange={(e) => setEditForm({ ...editForm, target_completion_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add any notes or comments..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Item Details */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-gray-600 mb-4">{item.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Priority</div>
                    <div className="font-medium capitalize">{item.priority}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className="font-medium capitalize">{item.status.replace('_', ' ')}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Progress</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.completion_percentage}%` }}
                        />
                      </div>
                      <span className="font-medium text-sm">{item.completion_percentage}%</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Timeframe</div>
                    <div className="font-medium capitalize">{item.timeframe.replace('_', ' ')}</div>
                  </div>
                </div>

                {item.target_completion_date && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Target: {new Date(item.target_completion_date).toLocaleDateString()}</span>
                  </div>
                )}

                {item.notes && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-yellow-800 mb-1">Notes</div>
                        <p className="text-sm text-yellow-900">{item.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Update History Timeline */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Update History</h4>
                  <button
                    onClick={() => setShowUpdateForm(!showUpdateForm)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {showUpdateForm ? 'Cancel' : '+ Add Update'}
                  </button>
                </div>

                {/* Add Update Form */}
                {showUpdateForm && (
                  <form onSubmit={handleAddUpdate} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Update Type</label>
                        <select
                          value={updateForm.update_type}
                          onChange={(e) => setUpdateForm({ ...updateForm, update_type: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="progress_update">Progress Update</option>
                          <option value="note_added">Note Added</option>
                          <option value="blocked">Blocked</option>
                          <option value="status_change">Status Change</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={updateForm.notes}
                          onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Describe the update..."
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm"
                      >
                        Add Update
                      </button>
                    </div>
                  </form>
                )}

                {/* Timeline */}
                <div className="space-y-3">
                  {updates && updates.length > 0 ? (
                    updates.map((update: PlanUpdate) => (
                      <div key={update.id} className="flex gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getUpdateTypeColor(update.update_type)}`}>
                          {getUpdateTypeIcon(update.update_type)}
                        </div>
                        <div className="flex-1 pb-4 border-b border-gray-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-sm capitalize">
                                {update.update_type.replace('_', ' ')}
                              </div>
                              {update.notes && (
                                <p className="text-sm text-gray-600 mt-1">{update.notes}</p>
                              )}
                              {update.previous_value && update.new_value && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Changed from {update.previous_value} to {update.new_value}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(update.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No updates yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500">
              Created: {new Date(item.created_at).toLocaleDateString()} •
              Last updated: {new Date(item.updated_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
