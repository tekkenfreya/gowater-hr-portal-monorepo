/**
 * Task Status Auto-Calculator
 *
 * Automatically derives main task status based on subtask statuses.
 * This follows modern task management best practices (Notion, Linear).
 */

import { SubTask } from '@/types/attendance';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived';
export type SubTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancel';

/**
 * Calculate main task status based on subtasks
 *
 * Logic:
 * - ALL completed → completed
 * - ANY in_progress → in_progress
 * - ALL cancel → cancel
 * - ALL pending (nothing started) → pending
 * - MIXED states (completed+pending, completed+cancel, etc.) → in_progress
 * - No subtasks → keep current status (user-controlled)
 * - archived → stays archived (manual action only)
 */
export function calculateTaskStatus(
  subtasks: SubTask[],
  currentStatus?: TaskStatus
): TaskStatus {
  // If task is archived, never auto-update (manual only)
  if (currentStatus === 'archived') {
    return 'archived';
  }

  // No subtasks = user controls status manually
  if (!subtasks || subtasks.length === 0) {
    return currentStatus || 'pending';
  }

  const statuses = subtasks.map(st => st.status);
  const counts = {
    completed: statuses.filter(s => s === 'completed').length,
    in_progress: statuses.filter(s => s === 'in_progress').length,
    pending: statuses.filter(s => s === 'pending').length,
    cancel: statuses.filter(s => s === 'cancel').length,
  };

  const total = subtasks.length;

  // ALL completed → Task completed ✅
  if (counts.completed === total) {
    return 'completed';
  }

  // ANY in_progress → Task in progress 🔵
  if (counts.in_progress > 0) {
    return 'in_progress';
  }

  // ALL canceled → Task canceled ❌
  if (counts.cancel === total) {
    return 'cancel';
  }

  // ALL pending (nothing started yet) → Task pending ⏳
  if (counts.pending === total) {
    return 'pending';
  }

  // Mixed states (some done, some pending, some canceled) → in_progress 🔵
  // This covers: completed+pending, completed+cancel, pending+cancel, etc.
  if (counts.completed > 0 || counts.pending > 0 || counts.cancel > 0) {
    return 'in_progress';
  }

  // Default fallback
  return currentStatus || 'pending';
}

/**
 * Check if all subtasks are completed (ready to archive)
 */
export function canArchiveTask(subtasks: SubTask[]): boolean {
  if (!subtasks || subtasks.length === 0) {
    return false;
  }
  return subtasks.every(st => st.status === 'completed');
}

/**
 * Get progress percentage
 */
export function getTaskProgress(subtasks: SubTask[]): number {
  if (!subtasks || subtasks.length === 0) {
    return 0;
  }
  const completed = subtasks.filter(st => st.status === 'completed').length;
  return Math.round((completed / subtasks.length) * 100);
}

/**
 * Get status badge color classes
 */
export function getStatusBadgeClass(status: TaskStatus | SubTaskStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancel':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'archived':
      return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get status display label
 */
export function getStatusLabel(status: TaskStatus | SubTaskStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'cancel':
      return 'Canceled';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}
