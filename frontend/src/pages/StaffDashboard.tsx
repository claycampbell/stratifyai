import { useQuery } from '@tanstack/react-query';
import { kpisApi, ogsmApi } from '@/lib/api';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  ListChecks,
  Target,
  TrendingUp,
  FileText,
  MessageSquare,
  Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
  });

  useQuery({
    queryKey: ['ogsm'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
  });

  // Mock data for staff-specific tasks and activities
  const myTasks = [
    {
      id: '1',
      title: 'Update Q1 Performance Report',
      description: 'Complete the quarterly performance metrics for the athletics program',
      priority: 'high',
      due_date: '2024-02-15',
      status: 'in_progress',
      category: 'Reporting',
      assigned_by: 'Sarah Johnson'
    },
    {
      id: '2',
      title: 'Prepare Budget Analysis',
      description: 'Analyze budget allocation for spring sports programs',
      priority: 'medium',
      due_date: '2024-02-18',
      status: 'pending',
      category: 'Finance',
      assigned_by: 'Michael Chen'
    },
    {
      id: '3',
      title: 'Review Facility Maintenance Schedule',
      description: 'Review and approve maintenance schedule for athletic facilities',
      priority: 'low',
      due_date: '2024-02-20',
      status: 'pending',
      category: 'Operations',
      assigned_by: 'David Martinez'
    },
    {
      id: '4',
      title: 'Update Team Roster Data',
      description: 'Input updated roster information for all spring teams',
      priority: 'high',
      due_date: '2024-02-16',
      status: 'pending',
      category: 'Data Entry',
      assigned_by: 'Emily Davis'
    },
    {
      id: '5',
      title: 'Coordinate Equipment Inventory',
      description: 'Complete inventory check for all athletic equipment',
      priority: 'medium',
      due_date: '2024-02-19',
      status: 'in_progress',
      category: 'Operations',
      assigned_by: 'James Wilson'
    }
  ];

  const recentNotifications = [
    {
      id: '1',
      type: 'task_assigned',
      message: 'New task assigned: Update Team Roster Data',
      time: '2 hours ago',
      read: false
    },
    {
      id: '2',
      type: 'deadline_approaching',
      message: 'Task due tomorrow: Update Q1 Performance Report',
      time: '4 hours ago',
      read: false
    },
    {
      id: '3',
      type: 'task_completed',
      message: 'Your task "Event Planning Checklist" was approved',
      time: '1 day ago',
      read: true
    },
    {
      id: '4',
      type: 'comment',
      message: 'Sarah Johnson commented on "Budget Analysis"',
      time: '1 day ago',
      read: true
    }
  ];

  const taskStats = {
    total: myTasks.length,
    completed: 0,
    inProgress: myTasks.filter(t => t.status === 'in_progress').length,
    pending: myTasks.filter(t => t.status === 'pending').length,
    overdue: 0
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckSquare className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending': return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name || 'Team Member'}
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what needs your attention today
        </p>
      </div>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{taskStats.total}</p>
            </div>
            <ListChecks className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">In Progress</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{taskStats.inProgress}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Pending</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{taskStats.pending}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-purple-600" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{taskStats.completed}</p>
            </div>
            <CheckSquare className="h-10 w-10 text-green-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                  All
                </button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  High Priority
                </button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Due Soon
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                    selectedTask === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedTask(task.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(task.due_date)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {task.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            Assigned by {task.assigned_by}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/documents"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">View Documents</h3>
                  <p className="text-xs text-gray-600">Access strategic plans</p>
                </div>
              </Link>

              <Link
                to="/kpis"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">View KPIs</h3>
                  <p className="text-xs text-gray-600">Track performance metrics</p>
                </div>
              </Link>

              <Link
                to="/ogsm"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <Target className="h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Strategic Goals</h3>
                  <p className="text-xs text-gray-600">Review OGSM framework</p>
                </div>
              </Link>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-orange-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Ask AI</h3>
                  <p className="text-xs text-gray-600">Get strategic insights</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Notifications & Info */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Mark all read
              </button>
            </div>
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <Bell className={`h-4 w-4 mt-0.5 ${notification.read ? 'text-gray-400' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related KPIs */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Related KPIs</h2>
            <div className="space-y-3">
              {kpis?.slice(0, 4).map((kpi: any) => {
                const progress = kpi.target_value && kpi.current_value
                  ? (kpi.current_value / kpi.target_value) * 100
                  : 0;
                return (
                  <div key={kpi.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{kpi.name}</h3>
                      <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          progress >= 90 ? 'bg-green-500' :
                          progress >= 70 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-600">
                        {kpi.current_value || 0} / {kpi.target_value || 100}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!kpis || kpis.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No KPIs assigned yet</p>
              )}
            </div>
          </div>

          {/* My Schedule */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">This Week's Schedule</h2>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Team Meeting</h3>
                    <p className="text-xs text-gray-600 mt-1">Today, 2:00 PM</p>
                  </div>
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Budget Review</h3>
                    <p className="text-xs text-gray-600 mt-1">Tomorrow, 10:00 AM</p>
                  </div>
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Strategy Session</h3>
                    <p className="text-xs text-gray-600 mt-1">Friday, 3:00 PM</p>
                  </div>
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
