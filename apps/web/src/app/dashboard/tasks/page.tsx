'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/attendance';
import TaskTimelineView from '@/components/TaskTimelineView';
import { logger } from '@/lib/logger';
import { simpleWhatsAppService } from '@/lib/whatsapp-simple';

interface StatusConfig {
  id: number;
  status_key: string;
  display_name: string;
  display_tag: string | null;
  color_class: string | null;
  sort_order: number;
  is_active: boolean;
  entity_type: string;
}

export default function TasksPage() {
  const { user, isLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState<'tasks' | 'pending' | 'in_progress' | 'completed' | null>(null);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'start' | 'eod'>('eod');
  const [taskFilter, setTaskFilter] = useState<'all' | 'my-tasks' | 'assigned-by-me' | 'completed' | 'archived'>('all');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [breakDuration, setBreakDuration] = useState<number>(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [reportTasks, setReportTasks] = useState<Array<{
    task: Task;
    status: 'pending' | 'in_progress' | 'completed' | 'cancel';
    subTasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in_progress' | 'completed' | 'cancel';
      description: string;
    }>;
  }>>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subTasks: [] as { id: string; title: string; notes: string; status: 'pending' | 'in_progress' | 'completed' | 'cancel' }[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchTodayAttendance();
      fetchStatusConfigs();
    }
  }, [user]);

  const fetchStatusConfigs = async () => {
    try {
      const response = await fetch('/api/config/statuses?entity_type=task');
      if (response.ok) {
        const data = await response.json();
        setStatusConfigs(data.statuses);
      }
    } catch (error) {
      logger.error('Failed to fetch status configs', error);
    }
  };

  const getStatusTag = (statusKey: string): string => {
    const config = statusConfigs.find(c => c.status_key === statusKey);
    return config?.display_tag || `[${statusKey.toUpperCase()}]`;
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        if (data.attendance && data.attendance.checkInTime) {
          setCheckInTime(data.attendance.checkInTime);
          setBreakDuration(data.attendance.breakDuration || 0);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
  };

  const formatBreakTime = (seconds: number): string => {
    if (seconds === 0) return 'No break';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        logger.error('Failed to fetch tasks', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (status: 'tasks' | 'pending' | 'in_progress' | 'completed') => {
    if (!newTask.title.trim()) return;

    // Map 'tasks' to 'pending' for API (Tasks column uses pending status internally)
    const apiStatus = status === 'tasks' ? 'pending' : status;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, status: apiStatus }),
      });

      if (response.ok) {
        setNewTask({ title: '', description: '', subTasks: [], priority: 'medium' });
        setShowAddTask(null);
        await fetchTasks();
      } else {
        logger.error('Failed to create task', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to create task', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Optimistic delete - remove from UI immediately
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));

    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        logger.error('Failed to delete task', new Error('Response not ok'));
        // Revert by fetching fresh data
        await fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to delete task', error);
      // Revert by fetching fresh data
      await fetchTasks();
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask),
      });

      if (response.ok) {
        setEditingTask(null);
        await fetchTasks();
      } else {
        logger.error('Failed to update task', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to update task', error);
    }
  };

  // Handle updates from timeline view
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    try {
      // Find the task to get its current status
      const task = tasks.find(t => t.id === id);
      const isChangingToCancel = updates.status === 'cancel' && task?.status !== 'cancel';

      // Optimistic update
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === id ? { ...task, ...updates } : task
        )
      );

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        logger.error('Failed to update task', new Error('Response not ok'));
        // Revert on failure
        await fetchTasks();
        return;
      }

      // Send notification to admins if task is being cancelled by non-admin
      if (isChangingToCancel && user && user.role !== 'admin') {
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task_cancellation',
              title: 'Task Cancellation Request',
              message: `${user.name} has requested to cancel task: "${task?.title}"`,
              taskId: id,
              userId: user.id,
              userName: user.name
            }),
          });
        } catch (notifError) {
          logger.error('Failed to send cancellation notification', notifError);
          // Don't fail the task update if notification fails
        }
      }
    } catch (error) {
      logger.error('Failed to update task', error);
      // Revert on error
      await fetchTasks();
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  // Filter tasks based on selected filter
  const getFilteredTasks = () => {
    switch (taskFilter) {
      case 'my-tasks':
        // Show only active (not completed, not archived) tasks
        return tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
      case 'assigned-by-me':
        // Show tasks in progress
        return tasks.filter(t => t.status === 'in_progress');
      case 'completed':
        return tasks.filter(t => t.status === 'completed');
      case 'archived':
        return tasks.filter(t => t.status === 'archived');
      default:
        // Show all tasks except archived (unless archived filter is selected)
        return tasks.filter(t => t.status !== 'archived');
    }
  };

  const filteredTasks = getFilteredTasks();

  const filterTabs: Array<{ key: typeof taskFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'my-tasks', label: 'Active' },
    { key: 'assigned-by-me', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'archived', label: 'Archived' },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center space-x-6">
          {/* Title + count */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Tasks</h1>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full text-cyan-400"
              style={{ background: 'rgba(125,211,252,0.12)' }}
            >
              {filteredTasks.length}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTaskFilter(tab.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  taskFilter === tab.key
                    ? 'text-cyan-400'
                    : 'hover:text-cyan-400'
                }`}
                style={
                  taskFilter === tab.key
                    ? { background: 'rgba(125,211,252,0.1)', color: '#7dd3fc' }
                    : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Report button */}
          <button
            onClick={() => setShowReportTypeModal(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#7dd3fc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Report</span>
          </button>

          {/* Add Task button */}
          <button
            onClick={() => setShowAddTask('tasks')}
            className="flex items-center space-x-2 bg-white hover:bg-gray-100 text-gray-900 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <PlusIcon />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <TaskTimelineView
          tasks={filteredTasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={deleteTask}
          getPriorityColor={getPriorityColor}
          userRole={user?.role}
          onRefresh={fetchTasks}
          onEdit={(task) => setEditingTask(task)}
        />
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(15,24,36,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Add New Task
            </h3>
            <div className="space-y-4">
              {/* Project/Main Task Title */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Project/Main Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="e.g., GoWater Dispenser"
                  autoFocus
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Sub-tasks</label>
                  <button
                    onClick={() => {
                      const newSubTask = {
                        id: `temp-${Date.now()}`,
                        title: '',
                        notes: '',
                        status: 'pending' as const
                      };
                      setNewTask({ ...newTask, subTasks: [...newTask.subTasks, newSubTask] });
                    }}
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    <PlusIcon />
                    <span>Add Sub-task</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {newTask.subTasks.map((subTask, index) => (
                    <div
                      key={subTask.id}
                      className="rounded-lg p-3"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{index + 1}.</span>
                        <input
                          type="text"
                          value={subTask.title}
                          onChange={(e) => {
                            const updated = [...newTask.subTasks];
                            updated[index].title = e.target.value;
                            setNewTask({ ...newTask, subTasks: updated });
                          }}
                          className="flex-1 px-3 py-1.5 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                          placeholder="e.g., Add Code"
                        />
                        <button
                          onClick={() => {
                            const updated = newTask.subTasks.filter((_, i) => i !== index);
                            setNewTask({ ...newTask, subTasks: updated });
                          }}
                          className="p-1 rounded text-red-400 hover:text-red-300"
                          style={{ background: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}

                  {newTask.subTasks.length === 0 && (
                    <div
                      className="text-center py-6 text-sm rounded-lg"
                      style={{ color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.15)' }}
                    >
                      No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Priority</label>
                <div className="flex space-x-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                        newTask.priority === priority
                          ? 'bg-cyan-500 text-white shadow-lg'
                          : 'text-white hover:text-cyan-400'
                      }`}
                      style={
                        newTask.priority !== priority
                          ? { background: 'rgba(255,255,255,0.08)' }
                          : undefined
                      }
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => addTask(showAddTask)}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => {
                  setNewTask({ title: '', description: '', subTasks: [], priority: 'medium' });
                  setShowAddTask(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Type Selection Modal */}
      {showReportTypeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ background: 'rgba(15,24,36,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-xl font-bold text-white mb-2">
              Send WhatsApp Report
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Choose the type of report you want to send
            </p>

            <div className="space-y-3">
              {/* Start Report Button */}
              <button
                onClick={() => {
                  setReportType('start');
                  // Initialize report tasks from current tasks (exclude archived)
                  const reportData = tasks
                    .filter(t => t.status !== 'archived' && (t.status === 'pending' || t.status === 'cancel'))
                    .map(task => ({
                      task,
                      status: task.status as 'pending' | 'cancel',
                      subTasks: (task.subTasks || []).map(st => ({
                        id: st.id,
                        title: st.title,
                        status: task.status as 'pending' | 'cancel',
                        description: ''
                      }))
                    }));
                  setReportTasks(reportData);
                  setShowReportTypeModal(false);
                  setShowReportModal(true);
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Start Report</div>
                    <div className="text-xs text-blue-100">Tasks for the day</div>
                  </div>
                </div>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* EOD Report Button */}
              <button
                onClick={() => {
                  setReportType('eod');
                  // Initialize report tasks from current tasks (exclude archived)
                  const reportData = tasks
                    .filter(t =>
                      t.status !== 'archived' &&
                      (t.status === 'pending' ||
                      t.status === 'in_progress' ||
                      t.status === 'completed' ||
                      t.status === 'cancel')
                    )
                    .map(task => ({
                      task,
                      status: task.status as 'pending' | 'in_progress' | 'completed' | 'cancel',
                      subTasks: (task.subTasks || []).map(st => ({
                        id: st.id,
                        title: st.title,
                        status: task.status as 'pending' | 'in_progress' | 'completed' | 'cancel',
                        description: ''
                      }))
                    }));
                  setReportTasks(reportData);
                  setShowReportTypeModal(false);
                  setShowReportModal(true);
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">EOD Report</div>
                    <div className="text-xs text-red-100">End of day with status</div>
                  </div>
                </div>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowReportTypeModal(false)}
              className="w-full mt-4 py-2.5 px-4 rounded-lg font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(15,24,36,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Edit Task
            </h3>
            <div className="space-y-4">
              {/* Project/Main Task Title */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Project/Main Task Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="e.g., GoWater Dispenser"
                  autoFocus
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Sub-tasks</label>
                  <button
                    onClick={() => {
                      const newSubTask = {
                        id: `temp-${Date.now()}`,
                        title: '',
                        notes: '',
                        status: 'pending' as const
                      };
                      setEditingTask({
                        ...editingTask,
                        subTasks: [...(editingTask.subTasks || []), newSubTask]
                      });
                    }}
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    <PlusIcon />
                    <span>Add Sub-task</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(editingTask.subTasks || []).map((subTask, index) => (
                    <div
                      key={subTask.id}
                      className="rounded-lg p-3"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{index + 1}.</span>
                        <input
                          type="text"
                          value={subTask.title}
                          onChange={(e) => {
                            const updated = [...(editingTask.subTasks || [])];
                            updated[index].title = e.target.value;
                            setEditingTask({ ...editingTask, subTasks: updated });
                          }}
                          className="flex-1 px-3 py-1.5 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                          placeholder="e.g., Add Code"
                        />
                        <button
                          onClick={() => {
                            const updated = (editingTask.subTasks || []).filter((_, i) => i !== index);
                            setEditingTask({ ...editingTask, subTasks: updated });
                          }}
                          className="p-1 rounded text-red-400 hover:text-red-300"
                          style={{ background: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!editingTask.subTasks || editingTask.subTasks.length === 0) && (
                    <div
                      className="text-center py-6 text-sm rounded-lg"
                      style={{ color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.15)' }}
                    >
                      No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Priority</label>
                <div className="flex space-x-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setEditingTask({ ...editingTask, priority })}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                        editingTask.priority === priority
                          ? 'bg-cyan-500 text-white shadow-lg'
                          : 'text-white hover:text-cyan-400'
                      }`}
                      style={
                        editingTask.priority !== priority
                          ? { background: 'rgba(255,255,255,0.08)' }
                          : undefined
                      }
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateTask}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal with Status Dropdowns */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(15,24,36,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-xl font-bold text-white mb-2">
              {reportType === 'eod' ? 'End of Day Report' : 'Start of Day Report'}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Review and update task statuses, then send your report
            </p>

            <div className="space-y-4 mb-6">
              {reportTasks.map((reportTask, taskIndex) => (
                <div
                  key={reportTask.task.id}
                  className="rounded-lg p-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* Main Task */}
                  <div className="mb-3">
                    <h4 className="font-bold text-white text-base">{reportTask.task.title}</h4>
                  </div>

                  {/* Sub-tasks */}
                  {reportTask.subTasks.length > 0 && (
                    <div className="space-y-2 ml-4">
                      {reportTask.subTasks.map((subTask, subIndex) => (
                        <div
                          key={subTask.id}
                          className="rounded-lg p-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <div className="flex items-start space-x-2 mb-2">
                            <span className="text-sm font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{subIndex + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className={`text-sm font-medium flex-1 ${
                                  subTask.status === 'completed'
                                    ? 'line-through'
                                    : ''
                                }`} style={{ color: subTask.status === 'completed' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)' }}>
                                  {subTask.title}
                                </p>
                                <select
                                  value={subTask.status}
                                  onChange={(e) => {
                                    const updated = [...reportTasks];
                                    updated[taskIndex].subTasks[subIndex].status = e.target.value as 'pending' | 'in_progress' | 'completed' | 'cancel';
                                    setReportTasks(updated);
                                  }}
                                  className={`ml-2 px-2.5 py-1 border-2 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${
                                    subTask.status === 'pending'
                                      ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-orange-500'
                                      : subTask.status === 'in_progress'
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 focus:ring-blue-500'
                                      : 'bg-green-50 border-green-300 text-green-700 focus:ring-green-500'
                                  }`}
                                >
                                  <option value="pending" className="bg-white text-orange-700 font-semibold">Pending</option>
                                  <option value="in_progress" className="bg-white text-blue-700 font-semibold">In Progress</option>
                                  <option value="completed" className="bg-white text-green-700 font-semibold">Completed</option>
                                </select>
                              </div>
                              <textarea
                                value={subTask.description}
                                onChange={(e) => {
                                  const updated = [...reportTasks];
                                  updated[taskIndex].subTasks[subIndex].description = e.target.value;
                                  setReportTasks(updated);
                                }}
                                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                                rows={2}
                                placeholder="Input your notes here"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {reportTasks.length === 0 && (
                <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <p className="text-lg font-medium">No tasks to report</p>
                  <p className="text-sm mt-2">Add some tasks to your board first</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Generate and send report
                  if (!user) return;

                  // Check which tasks will be archived
                  const tasksToArchive = reportTasks.filter(reportTask => {
                    return reportTask.subTasks.length > 0 &&
                           reportTask.subTasks.every(st => st.status === 'completed');
                  });

                  // Show confirmation if there are tasks to archive
                  if (tasksToArchive.length > 0) {
                    const taskNames = tasksToArchive.map(t => `• ${t.task.title}`).join('\n');
                    const confirmMessage = `The following ${tasksToArchive.length} task(s) will be archived because all subtasks are completed:\n\n${taskNames}\n\nDo you want to proceed with sending the report and archiving these tasks?`;

                    if (!confirm(confirmMessage)) {
                      return; // User cancelled
                    }
                  }

                  const now = new Date();
                  const dateOptions: Intl.DateTimeFormatOptions = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  };
                  const formattedDate = now.toLocaleDateString('en-US', dateOptions);

                  const timeIn = checkInTime
                    ? new Date(checkInTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Not checked in';

                  const tasksSection = reportTasks.map((reportTask) => {
                    let projectText = reportTask.task.title;

                    if (reportTask.subTasks.length > 0) {
                      projectText += '\n \n';
                      projectText += reportTask.subTasks.map((subTask, index) => {
                        // Use config-based status tag instead of hardcoded values
                        const statusTag = getStatusTag(subTask.status);

                        let subTaskText = `${index + 1}. ${subTask.title} ${statusTag}`;

                        if (subTask.description.trim()) {
                          const noteLines = subTask.description.split('\n').filter(line => line.trim());
                          if (noteLines.length > 0) {
                            subTaskText += '\n' + noteLines.map(line => `  ${line.trim()}`).join('\n');
                          }
                        }
                        return subTaskText;
                      }).join('\n\n');
                    }

                    // Add task updates if available
                    if (reportTask.task.updates && reportTask.task.updates.length > 0) {
                      projectText += '\n \nTask Updates:';
                      reportTask.task.updates.forEach((update) => {
                        const updateDate = new Date(update.created_at);
                        const formattedUpdateDate = updateDate.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                        projectText += `\n• [${formattedUpdateDate}] ${update.update_text}`;
                      });
                    }

                    return projectText;
                  }).join('\n\n');

                  const reportTitle = reportType === 'eod' ? 'GoWater EOD Tasks Report' : 'GoWater Tasks Report';
                  const report = `${reportTitle}

Date: ${formattedDate}
Time In: ${timeIn}
Break Time: ${formatBreakTime(breakDuration)}
Employee: ${user.employeeName || user.name}
Position: ${user.position || user.role}

Today's Tasks:
${tasksSection || 'No tasks for today'}`;

                  // Archive tasks where all subtasks are completed
                  const archivePromises = tasksToArchive.map(reportTask => {
                    // Archive this task
                    return fetch('/api/tasks', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: reportTask.task.id,
                        status: 'archived'
                      }),
                    });
                  });

                  // Execute all archive operations
                  Promise.all(archivePromises)
                    .then(() => {
                      // Send via WhatsApp after archiving
                      return simpleWhatsAppService.sendReport(report);
                    })
                    .then(() => {
                      logger.info(`WhatsApp ${reportType} report sent successfully`);
                      // Refresh tasks to reflect archived status
                      fetchTasks();
                      setShowReportModal(false);
                    })
                    .catch((error) => {
                      logger.error('Failed to send WhatsApp report or archive tasks', error);
                      alert('Failed to send report. Please try again.');
                    });
                }}
                disabled={reportTasks.length === 0}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  reportTasks.length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Send WhatsApp Report
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-3 px-4 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-7 h-7"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}
