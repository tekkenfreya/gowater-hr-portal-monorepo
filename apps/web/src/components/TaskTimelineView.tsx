'use client';

import { Task } from '@/types/attendance';
import { useState } from 'react';

interface TaskTimelineViewProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (id: string) => void;
  getPriorityColor: (priority: Task['priority']) => string;
  userRole?: string;
  onRefresh?: () => void;
}

export default function TaskTimelineView({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  getPriorityColor,
  userRole,
  onRefresh
}: TaskTimelineViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(tasks.map(t => t.id)));
  const [editingNote, setEditingNote] = useState<{ taskId: string; subTaskId: string } | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-500';
      case 'cancel':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusTextColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'text-orange-700';
      case 'in_progress':
        return 'text-blue-700';
      case 'completed':
        return 'text-green-700';
      case 'cancel':
        return 'text-red-700';
      case 'archived':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusBgColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-50 border-orange-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'cancel':
        return 'bg-red-50 border-red-200';
      case 'archived':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Helper to safely convert date to timestamp for comparison
  const getTimestamp = (dateValue: Date | string | undefined | null): number => {
    if (!dateValue) return 0;
    try {
      const date = new Date(dateValue);
      const timestamp = date.getTime();
      return isNaN(timestamp) ? 0 : timestamp;
    } catch {
      return 0;
    }
  };

  const formatDate = (dateValue: Date | string | undefined | null): string => {
    if (!dateValue) return 'No date';

    try {
      const date = new Date(dateValue);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'No date';
      }

      // Show exact date format: "Jan 14, 2026"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'No date';
    }
  };

  // Check if task was updated after creation (with 1 second tolerance)
  const wasUpdated = (task: Task): boolean => {
    const createdTs = getTimestamp(task.createdAt);
    const updatedTs = getTimestamp(task.updatedAt);
    // Consider updated if updatedAt is more than 1 second after createdAt
    return updatedTs > 0 && createdTs > 0 && (updatedTs - createdTs) > 1000;
  };

  const calculateProgress = (task: Task) => {
    if (!task.subTasks || task.subTasks.length === 0) return 0;
    const completed = task.subTasks.filter(st => st.status === 'completed').length;
    return (completed / task.subTasks.length) * 100;
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    await onTaskUpdate(task.id, { status: newStatus });
  };

  const handleSubTaskToggle = async (task: Task, subTaskId: string) => {
    const updatedSubTasks = task.subTasks.map(st =>
      st.id === subTaskId ? { ...st, status: (st.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed' } : st
    );
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
  };

  const handleSubTaskDelete = async (task: Task, subTaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    const updatedSubTasks = task.subTasks.filter(st => st.id !== subTaskId);
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
  };

  const handleNoteEdit = (taskId: string, subTaskId: string, currentNote: string) => {
    setEditingNote({ taskId, subTaskId });
    setNoteValue(currentNote);
  };

  const handleNoteSave = async (task: Task, subTaskId: string) => {
    const updatedSubTasks = task.subTasks.map(st =>
      st.id === subTaskId ? { ...st, notes: noteValue } : st
    );
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
    setEditingNote(null);
    setNoteValue('');
  };

  const handleNoteCancel = () => {
    setEditingNote(null);
    setNoteValue('');
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg font-medium">No tasks found</p>
          <p className="text-gray-500 text-sm mt-1">Create a new task to get started</p>
        </div>
      </div>
    );
  }

  // Sort tasks by date (latest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = getTimestamp(a.createdAt);
    const dateB = getTimestamp(b.createdAt);
    // If both have valid dates, sort by newest first
    // If one has no date (0), put it at the end
    if (dateA === 0 && dateB === 0) return 0;
    if (dateA === 0) return 1; // a goes after b
    if (dateB === 0) return -1; // b goes after a
    return dateB - dateA; // Descending order (newest first)
  });

  return (
    <div className="space-y-4 pb-6">
      {sortedTasks.map((task) => {
        const isExpanded = expandedTasks.has(task.id);
        const progress = calculateProgress(task);
        const hasSubTasks = task.subTasks && task.subTasks.length > 0;
        const hasUpdates = task.updates && task.updates.length > 0;
        const isExpandable = hasSubTasks || hasUpdates;

        return (
          <div
            key={task.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
          >
            {/* Task Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Expand/Collapse Button */}
                  {isExpandable && (
                    <button
                      onClick={() => toggleTaskExpanded(task.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand to view details'}
                    >
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {/* Task Title */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                      {/* Date Badge */}
                      <span
                        className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                        title={wasUpdated(task)
                          ? `Created: ${formatDate(task.createdAt)} | Updated: ${formatDate(task.updatedAt)}`
                          : `Created: ${formatDate(task.createdAt)}`}
                      >
                        {formatDate(task.createdAt)}
                        {wasUpdated(task) && (
                          <span className="ml-1 text-blue-500">•</span>
                        )}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                    <span className="text-xs text-gray-600 capitalize">{task.priority}</span>
                  </div>

                  {/* Status Dropdown - All Users Can Change */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as Task['status'])}
                    className={`px-3 py-1.5 border-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 transition-all cursor-pointer ${getStatusBgColor(task.status)} ${getStatusTextColor(task.status)}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancel">Cancel</option>
                    {userRole === 'admin' && <option value="archived">Archived</option>}
                  </select>

                  {/* Add Update Button */}
                  <button
                    onClick={() => {
                      setUpdatingTaskId(task.id);
                      setShowUpdateModal(true);
                    }}
                    className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-all"
                    title="Add update/note"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete Button - Admin Only */}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => onTaskDelete(task.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-all"
                      title="Delete task"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {hasSubTasks && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${getStatusColor(task.status)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tasks */}
            {hasSubTasks && isExpanded && (
              <div className="p-4 bg-gray-50 space-y-2">
                {task.subTasks.map((subTask, index) => (
                  <div
                    key={subTask.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 transition-all hover:shadow-sm group"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox - Admin Only */}
                      {userRole === 'admin' ? (
                        <button
                          onClick={() => handleSubTaskToggle(task, subTask.id)}
                          className="mt-0.5"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              subTask.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {subTask.status === 'completed' && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div className="mt-0.5">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              subTask.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {subTask.status === 'completed' && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-task Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p
                            className={`text-sm font-medium flex-1 ${
                              subTask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            <span className="text-gray-500 mr-2">{index + 1}.</span>
                            {subTask.title}
                          </p>

                          {/* Action Buttons - Admin Only */}
                          {userRole === 'admin' && (
                            <div className="flex items-center space-x-1 ml-2">
                              {/* Edit Note Button */}
                              <button
                                onClick={() => handleNoteEdit(task.id, subTask.id, subTask.notes || '')}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Edit notes"
                              >
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Delete Subtask Button */}
                              <button
                                onClick={() => handleSubTaskDelete(task, subTask.id)}
                                className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete subtask"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Notes Display or Editor */}
                        {editingNote?.taskId === task.id && editingNote?.subTaskId === subTask.id ? (
                          <div className="mt-2">
                            <textarea
                              value={noteValue}
                              onChange={(e) => setNoteValue(e.target.value)}
                              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Add notes..."
                              autoFocus
                            />
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => handleNoteSave(task, subTask.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleNoteCancel}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          subTask.notes && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                              {subTask.notes.split('\n').map((line, i) => (
                                <p key={i} className="mb-0.5 last:mb-0">
                                  {line}
                                </p>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Task Updates History */}
            {task.updates && task.updates.length > 0 && isExpanded && (
              <div className="p-4 bg-blue-50 border-t border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Updates ({task.updates.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {task.updates.slice().reverse().map((update, index) => (
                    <div key={update.update_id} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">{update.user_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(update.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.update_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Task Update Modal */}
      {showUpdateModal && updatingTaskId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add Task Update</h3>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdatingTaskId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Add progress notes or updates to this task. Updates are permanent and cannot be deleted.
              </p>
            </div>

            <AddTaskUpdateForm
              taskId={updatingTaskId}
              task={tasks.find(t => t.id === updatingTaskId)}
              onClose={() => {
                setShowUpdateModal(false);
                setUpdatingTaskId(null);
              }}
              onUpdateAdded={async () => {
                setShowUpdateModal(false);
                setUpdatingTaskId(null);
                // Refresh tasks from parent
                if (onRefresh) {
                  onRefresh();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Add Task Update Form Component
interface AddTaskUpdateFormProps {
  taskId: string;
  task?: Task;
  onClose: () => void;
  onUpdateAdded: () => void;
}

function AddTaskUpdateForm({ taskId, task, onClose, onUpdateAdded }: AddTaskUpdateFormProps) {
  const [updateText, setUpdateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tasks/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          updateText: updateText.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add update');
      }

      onUpdateAdded();
    } catch (error) {
      console.error('Error adding task update:', error);
      alert('Failed to add update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Task: {task?.title}
        </label>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          placeholder="Enter your update or progress note here..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={6}
          disabled={isSubmitting}
          required
        />
      </div>

      {/* Display existing updates */}
      {task?.updates && task.updates.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Previous Updates</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {task.updates.slice().reverse().map((update) => (
              <div key={update.update_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-900">{update.user_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(update.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.update_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !updateText.trim()}
        >
          {isSubmitting ? 'Adding...' : 'Add Update'}
        </button>
      </div>
    </form>
  );
}
