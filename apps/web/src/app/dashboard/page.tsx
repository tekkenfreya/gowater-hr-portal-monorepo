'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import BreakModal from '@/components/BreakModal';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';
import { calculateTaskStatus, getStatusBadgeClass, getStatusLabel } from '@/utils/taskStatusCalculator';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  subTasks?: Array<{
    id: string;
    title: string;
    notes: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancel';
  }>;
  updates?: Array<{
    update_id: string;
    user_id: number;
    user_name: string;
    update_text: string;
    created_at: string;
  }>;
}

// Helper function to format subtask status for WhatsApp
function formatSubTaskStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    case 'cancel':
      return 'Canceled';
    default:
      return status;
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const { isTimedIn, isOnBreak, workDuration, breakDuration, accumulatedBreakDuration, breakStartTime, checkInTime, handleTimeOut, handleStartBreak, handleEndBreak, fetchTodayAttendance } = useAttendance();
  // Announcements state
  const [announcements, setAnnouncements] = useState<Array<{
    id: number;
    title: string;
    content: string;
    priority: string;
    created_at: string;
  }>>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    target_audience: 'all' as 'all' | 'managers' | 'employees',
    expires_at: ''
  });

  // Today's stats state
  const [todayStats, setTodayStats] = useState({
    activeTasks: 0,
    hoursToday: 0
  });
  const [dashboardTasks, setDashboardTasks] = useState<Task[]>([]);

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInTasks, setCheckInTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [checkInCopied, setCheckInCopied] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    subTasks: [] as { id: string; title: string; notes: string; status: 'pending' | 'in_progress' | 'completed' | 'cancel' }[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // Check-out modal state
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutTasks, setCheckOutTasks] = useState<Task[]>([]);
  const [isLoadingCheckOutTasks, setIsLoadingCheckOutTasks] = useState(false);

  // Work location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentWorkArrangement, setCurrentWorkArrangement] = useState<'WFH' | 'Onsite' | 'Field' | null>(null);

  // Report copied confirmation modal state
  const [showReportCopiedModal, setShowReportCopiedModal] = useState(false);

  // EOD Report copied confirmation modal state
  const [showEodReportCopiedModal, setShowEodReportCopiedModal] = useState(false);

  // Home page copy report state
  const [homeReportCopied, setHomeReportCopied] = useState(false);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      logger.error('Failed to fetch announcements', error);
      setAnnouncements([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  // Fetch today's stats
  const fetchTodayStats = async () => {
    try {
      // Fetch tasks to count active ones (incomplete tasks persist until completed)
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        const activeTasks = (data.tasks || []).filter((task: Task) =>
          task.status !== 'archived' &&
          task.status !== 'completed'
        );
        setTodayStats(prev => ({ ...prev, activeTasks: activeTasks.length }));
        setDashboardTasks(activeTasks);
      }
    } catch (error) {
      logger.error('Failed to fetch today stats', error);
    }
  };

  // Create announcement (admin only)
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('Please enter both title and content');
      return;
    }

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAnnouncement.title.trim(),
          content: newAnnouncement.content.trim(),
          priority: newAnnouncement.priority,
          target_audience: newAnnouncement.target_audience,
          expires_at: newAnnouncement.expires_at || null
        }),
      });

      if (response.ok) {
        // Refresh announcements list
        await fetchAnnouncements();
        // Reset form
        setNewAnnouncement({
          title: '',
          content: '',
          priority: 'normal',
          target_audience: 'all',
          expires_at: ''
        });
        setShowCreateAnnouncementModal(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create announcement');
      }
    } catch (error) {
      logger.error('Failed to create announcement', error);
      alert('Failed to create announcement');
    }
  };

  // Fetch tasks for check-in modal (incomplete tasks persist until completed)
  const fetchCheckInTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        // Filter for all incomplete tasks (not archived, not completed)
        const activeTasks = (data.tasks || [])
          .filter((task: Task) =>
            task.status !== 'archived' &&
            task.status !== 'completed'
          )
          .map((task: Task) => {
            // Filter out completed subtasks from check-in view
            if (task.subTasks && task.subTasks.length > 0) {
              const incompleteSubTasks = task.subTasks.filter(st => st.status !== 'completed');

              return {
                ...task,
                subTasks: incompleteSubTasks,
                _allSubTasksCompleted: incompleteSubTasks.length === 0
              };
            }
            return task;
          })
          // Remove tasks where all subtasks are completed
          .filter((task: Task & { _allSubTasksCompleted?: boolean }) => {
            if (task._allSubTasksCompleted) {
              return false; // Hide task if all subtasks are done
            }
            return true;
          });
        setCheckInTasks(activeTasks);
      }
    } catch (error) {
      logger.error('Failed to fetch check-in tasks', error);
      setCheckInTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Open check-in modal and fetch tasks
  const handleOpenCheckInModal = () => {
    setShowCheckInModal(true);
    setShowAddTaskForm(false);
    setNewTask({ title: '', subTasks: [], priority: 'medium' });
    fetchCheckInTasks();
  };

  // Create new task
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: '',
          priority: newTask.priority,
          status: 'pending',
          due_date: new Date().toISOString().split('T')[0],
          subTasks: newTask.subTasks
        }),
      });

      if (response.ok) {
        // Refresh task list
        await fetchCheckInTasks();
        // Reset form
        setNewTask({ title: '', subTasks: [], priority: 'medium' });
        setShowAddTaskForm(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create task');
      }
    } catch (error) {
      logger.error('Failed to create task', error);
      alert('Failed to create task');
    }
  };

  // Open edit task form
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      subTasks: (task.subTasks || []).map(st => ({
        id: st.id || `temp-${Date.now()}`,
        title: st.title || '',
        notes: st.notes || '',
        status: st.status || 'pending'
      })),
      priority: (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent'
    });
    setShowEditTaskForm(true);
    setShowAddTaskForm(false);
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!editingTask || !newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTask.id,
          title: newTask.title.trim(),
          description: editingTask.description || '',
          priority: newTask.priority,
          status: editingTask.status,
          subTasks: newTask.subTasks
        }),
      });

      if (response.ok) {
        // Refresh task list
        await fetchCheckInTasks();
        // Reset form
        setNewTask({ title: '', subTasks: [], priority: 'medium' });
        setEditingTask(null);
        setShowEditTaskForm(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update task');
      }
    } catch (error) {
      logger.error('Failed to update task', error);
      alert('Failed to update task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh task list
        await fetchCheckInTasks();
      } else {
        alert('Failed to delete task');
      }
    } catch (error) {
      logger.error('Failed to delete task', error);
      alert('Failed to delete task');
    }
  };

  // Show location selection modal when Confirm Login is clicked
  const handleConfirmLogin = () => {
    setShowLocationModal(true);
  };

  // Handle location selection and complete check-in
  const handleLocationSelect = async (location: 'WFH' | 'Onsite' | 'Field') => {
    try {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Format check-in time
      const checkInTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Format tasks section with sub-tasks
      const tasksSection = checkInTasks.length > 0
        ? checkInTasks.map((task, index) => {
            let taskText = `${index + 1}. ${task.title} [${task.status.toUpperCase()}]`;

            // Add sub-tasks if available
            if (task.subTasks && task.subTasks.length > 0) {
              task.subTasks.forEach((subTask, subIndex) => {
                const statusLabel = formatSubTaskStatus(subTask.status);
                taskText += `\n   ${subTask.title} [${statusLabel}]`;
                if (subTask.notes?.trim()) {
                  taskText += `\n   [${subTask.notes.trim()}]`;
                }
                // Add blank line after each subtask except the last
                if (subIndex < task.subTasks!.length - 1) {
                  taskText += `\n`;
                }
              });
            }

            return taskText;
          }).join('\n\n')
        : 'No tasks planned for today';

      const report = `GoWater Start of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Work Arrangement: ${location}
Login Time: ${checkInTimeFormatted}
Logout Time: N/A
Hours Worked: 0.00 hours
Break Time: 0m

Today's Planned Tasks:
${tasksSection}`;

      // Copy report to clipboard for manual pasting
      await navigator.clipboard.writeText(report);

      // Save work arrangement for EOD report
      setCurrentWorkArrangement(location);

      // Complete check-in with selected location - call API directly to check response
      const checkInResponse = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocation: location })
      });

      if (!checkInResponse.ok) {
        const errorData = await checkInResponse.json();
        logger.error('Check-in failed', errorData);
        alert(errorData.error || 'Failed to check in. Please try again.');
        return;
      }

      // Update attendance context state after successful check-in
      await fetchTodayAttendance();

      // Close location modal and show confirmation modal
      setShowLocationModal(false);
      setShowReportCopiedModal(true);

      logger.info('Check-in completed and report copied to clipboard');
    } catch (error) {
      logger.error('Failed to confirm login', error);
      alert('Failed to login. Please try again.');
    }
  };

  // Dismiss the report copied confirmation modal
  const handleDismissReportCopiedModal = () => {
    setShowReportCopiedModal(false);
    setShowCheckInModal(false);
  };

  // Dismiss the EOD report copied confirmation modal
  const handleDismissEodReportCopiedModal = () => {
    setShowEodReportCopiedModal(false);
  };

  // Copy report from home page (for users who lost clipboard content)
  const handleCopyReportFromHome = async () => {
    try {
      // Fetch current active tasks and fresh attendance data in parallel
      const [tasksResponse, attendanceResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/attendance')
      ]);

      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const tasksData = await tasksResponse.json();
      const activeTasks = (tasksData.tasks || []).filter((task: Task) =>
        task.status !== 'archived' &&
        task.status !== 'completed'
      );

      // Get fresh attendance data from database
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : null;
      const freshAttendance = attendanceData?.attendance;

      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Use fresh check-in time from database, fallback to context
      const actualCheckInTime = freshAttendance?.checkInTime || checkInTime;
      const checkInTimeFormatted = actualCheckInTime
        ? new Date(actualCheckInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Calculate hours worked from fresh database data
      let hoursWorked: string;
      if (actualCheckInTime) {
        const checkIn = new Date(actualCheckInTime);
        const totalSeconds = Math.floor((now.getTime() - checkIn.getTime()) / 1000);
        const breakSeconds = freshAttendance?.breakDuration || 0;
        const workSeconds = Math.max(0, totalSeconds - breakSeconds);
        hoursWorked = (workSeconds / 3600).toFixed(2);
      } else {
        hoursWorked = (workDuration / 3600).toFixed(2);
      }

      // Get break time from database
      const totalBreakSeconds = freshAttendance?.breakDuration || 0;
      const breakMinutes = Math.floor(totalBreakSeconds / 60);

      // Format tasks section with sub-tasks
      const tasksSection = activeTasks.length > 0
        ? activeTasks.map((task: Task, index: number) => {
            let taskText = `${index + 1}. ${task.title} [${task.status.toUpperCase()}]`;

            // Add sub-tasks if available
            if (task.subTasks && task.subTasks.length > 0) {
              task.subTasks.forEach((subTask, subIndex) => {
                const statusLabel = formatSubTaskStatus(subTask.status);
                taskText += `\n   ${subTask.title} [${statusLabel}]`;
                if (subTask.notes?.trim()) {
                  taskText += `\n   [${subTask.notes.trim()}]`;
                }
                if (subIndex < task.subTasks!.length - 1) {
                  taskText += `\n`;
                }
              });
            }

            return taskText;
          }).join('\n\n')
        : 'No tasks planned for today';

      const report = `GoWater Start of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Work Arrangement: ${currentWorkArrangement || freshAttendance?.workLocation || 'N/A'}
Login Time: ${checkInTimeFormatted}
Logout Time: N/A
Hours Worked: ${hoursWorked} hours
Break Time: ${breakMinutes}m

Today's Planned Tasks:
${tasksSection}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(report);

      // Show feedback
      setHomeReportCopied(true);
      setTimeout(() => setHomeReportCopied(false), 2000);

      logger.info('Report copied from home page');
    } catch (error) {
      logger.error('Failed to copy report from home', error);
      alert('Failed to copy report. Please try again.');
    }
  };

  // Copy check-in report to clipboard
  const handleCopyCheckInReport = async () => {
    try {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Format check-in time
      const checkInTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Format tasks section with sub-tasks
      const tasksSection = checkInTasks.length > 0
        ? checkInTasks.map((task, index) => {
            let taskText = `${index + 1}. ${task.title} [${task.status.toUpperCase()}]`;

            // Add sub-tasks if available
            if (task.subTasks && task.subTasks.length > 0) {
              task.subTasks.forEach((subTask, subIndex) => {
                const statusLabel = formatSubTaskStatus(subTask.status);
                taskText += `\n   ${subTask.title} [${statusLabel}]`;
                if (subTask.notes?.trim()) {
                  taskText += `\n   [${subTask.notes.trim()}]`;
                }
                // Add blank line after each subtask except the last
                if (subIndex < task.subTasks!.length - 1) {
                  taskText += `\n`;
                }
              });
            }

            return taskText;
          }).join('\n\n')
        : 'No tasks planned for today';

      const report = `GoWater Start of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Login Time: ${checkInTimeFormatted}
Logout Time: N/A
Hours Worked: 0.00 hours
Break Time: 0m

Today's Planned Tasks:
${tasksSection}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(report);

      // Show feedback
      setCheckInCopied(true);
      setTimeout(() => setCheckInCopied(false), 2000);

      logger.info('Check-in report copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy check-in report', error);
      alert('Failed to copy report to clipboard. Please try again.');
    }
  };

  // Fetch tasks for check-out modal (incomplete tasks persist until completed)
  const fetchCheckOutTasks = async () => {
    setIsLoadingCheckOutTasks(true);
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        // Get all incomplete tasks (pending/in_progress/cancel) - tasks persist until completed
        const activeTasks = (data.tasks || [])
          .filter((task: Task) =>
            task.status !== 'archived' &&
            task.status !== 'completed' &&
            (task.status === 'pending' || task.status === 'in_progress' || task.status === 'cancel')
          )
          .map((task: Task) => {
            // Filter out already-completed subtasks (from previous sessions)
            if (task.subTasks && task.subTasks.length > 0) {
              return {
                ...task,
                subTasks: task.subTasks.filter(st => st.status !== 'completed')
              };
            }
            return task;
          })
          // Remove tasks where all subtasks were already completed
          .filter((task: Task) => {
            if (task.subTasks && task.subTasks.length === 0) {
              return false; // Hide task if no incomplete subtasks
            }
            return true;
          });
        setCheckOutTasks(activeTasks);
      }
    } catch (error) {
      logger.error('Failed to fetch check-out tasks', error);
      setCheckOutTasks([]);
    } finally {
      setIsLoadingCheckOutTasks(false);
    }
  };

  // Open check-out modal and fetch tasks
  const handleOpenCheckOutModal = () => {
    setShowCheckOutModal(true);
    fetchCheckOutTasks();
  };

  // Update task status
  // Save all subtask updates before checking out
  const saveSubTaskUpdates = async () => {
    try {
      for (const task of checkOutTasks) {
        if (task.subTasks && task.subTasks.length > 0) {
          // Auto-calculate main task status from subtasks before saving
          const calculatedStatus = calculateTaskStatus(
            task.subTasks,
            task.status as 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived'
          );

          await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: task.id,
              title: task.title,
              description: task.description || '',
              priority: task.priority,
              status: calculatedStatus, // Save the auto-calculated status
              subTasks: task.subTasks
            }),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to save subtask updates', error);
    }
  };

  // Copy end-of-day report and check out
  const handleConfirmLogout = async () => {
    try {
      // Save subtask updates first
      await saveSubTaskUpdates();

      // Fetch fresh attendance data from database to ensure accurate hours
      const attendanceResponse = await fetch('/api/attendance');
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : null;
      const freshAttendance = attendanceData?.attendance;

      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Use fresh check-in time from database, fallback to context
      const actualCheckInTime = freshAttendance?.checkInTime || checkInTime;
      const checkInTimeFormatted = actualCheckInTime
        ? new Date(actualCheckInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';
      const checkOutTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Calculate hours worked from fresh database data
      // If we have fresh check-in time, calculate actual duration; otherwise use local state as fallback
      let hoursWorked: string;
      if (actualCheckInTime) {
        const checkIn = new Date(actualCheckInTime);
        const totalSeconds = Math.floor((now.getTime() - checkIn.getTime()) / 1000);
        const breakSeconds = freshAttendance?.breakDuration || accumulatedBreakDuration || 0;
        const workSeconds = Math.max(0, totalSeconds - breakSeconds);
        hoursWorked = (workSeconds / 3600).toFixed(2);
      } else {
        hoursWorked = (workDuration / 3600).toFixed(2);
      }

      // Format break time - use fresh data from database
      const totalBreakSeconds = freshAttendance?.breakDuration || accumulatedBreakDuration || 0;
      const formatBreakTime = (seconds: number): string => {
        if (seconds === 0) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      };

      // Format tasks section with sub-tasks and notes
      const tasksSection = checkOutTasks.length > 0
        ? checkOutTasks.map((task, index) => {
            let taskText = `${index + 1}. ${task.title} [${task.status.toUpperCase()}]`;

            // Add sub-tasks if available
            if (task.subTasks && task.subTasks.length > 0) {
              task.subTasks.forEach((subTask, subIndex) => {
                const statusLabel = formatSubTaskStatus(subTask.status);
                taskText += `\n   ${subTask.title} [${statusLabel}]`;
                // Add notes in brackets below subtask if available
                if (subTask.notes?.trim()) {
                  taskText += `\n   [${subTask.notes.trim()}]`;
                }
                // Add blank line after each subtask for readability (except the last one)
                if (subIndex < task.subTasks!.length - 1) {
                  taskText += `\n`;
                }
              });
            }

            return taskText;
          }).join('\n\n')
        : 'No tasks worked on today';

      const report = `GoWater End of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Work Arrangement: ${currentWorkArrangement || 'N/A'}
Login Time: ${checkInTimeFormatted}
Logout Time: ${checkOutTimeFormatted}
Hours Worked: ${hoursWorked} hours
Break Time: ${formatBreakTime(totalBreakSeconds + (isOnBreak ? breakDuration : 0))}

Today's Task Updates:
${tasksSection}`;

      // Try to copy report to clipboard (may fail on mobile browsers)
      let clipboardSuccess = false;
      try {
        await navigator.clipboard.writeText(report);
        clipboardSuccess = true;
      } catch (clipboardError) {
        logger.warn('Clipboard copy failed (common on mobile browsers)', clipboardError);
      }

      // Complete check-out with tasks from checkout modal
      await handleTimeOut(
        checkOutTasks.map(t => ({
          title: t.title,
          status: t.status,
          subTasks: (t.subTasks || []).map(st => ({
            title: st.title,
            completed: st.status === 'completed',
            status: st.status,
          })),
        }))
      );

      // Close checkout modal and show confirmation
      setShowCheckOutModal(false);
      setShowEodReportCopiedModal(true);

      logger.info('Check-out completed' + (clipboardSuccess ? ' and report copied to clipboard' : ''));
    } catch (error) {
      logger.error('Failed to confirm logout', error);
      alert('Failed to checkout. Please try again.');
    }
  };

  // Auth redirect handled by layout — no need to duplicate here

  // Fetch announcements and today's stats on mount
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchTodayStats();
    }
  }, [user]);

  // Update today's hours worked in real-time
  useEffect(() => {
    if (isTimedIn) {
      const hoursToday = workDuration / 3600;
      setTodayStats(prev => ({ ...prev, hoursToday: Math.round(hoursToday * 10) / 10 }));
    }
  }, [isTimedIn, workDuration]);

  // Fetch work arrangement from attendance when already checked in (e.g., page refresh)
  useEffect(() => {
    const fetchWorkArrangement = async () => {
      if (isTimedIn && !currentWorkArrangement) {
        try {
          const response = await fetch('/api/attendance');
          if (response.ok) {
            const data = await response.json();
            if (data.attendance?.workLocation) {
              setCurrentWorkArrangement(data.attendance.workLocation);
            }
          }
        } catch (error) {
          logger.error('Failed to fetch work arrangement', error);
        }
      }
    };
    fetchWorkArrangement();
  }, [isTimedIn, currentWorkArrangement]);

  // GSAP entrance animations
  const dashContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user || !dashContentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo('.dash-stat', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power3.out' });
      gsap.fromTo('.dash-actions', { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.3 });
      gsap.fromTo('.dash-section', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.2, delay: 0.5, ease: 'power2.out' });
    }, dashContentRef);

    return () => ctx.revert();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Breathing glow keyframe for login status */}
      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 20px rgba(34,197,94,0.8); }
        }
        .gw-gw-status-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>

      {/* Force Password Change Modal */}
      {user.force_password_reset && (
        <ForcePasswordChangeModal
          onPasswordChanged={() => {
            // Refetch user data to get updated force_password_reset flag
            refetch();
          }}
        />
      )}

      {/* Dashboard Content */}
      <div className="h-full flex flex-col relative overflow-hidden" ref={dashContentRef}>

          {/* Home Page Content */}
          <div className="flex-1 overflow-y-auto relative z-20">
            {/* Single unified dashboard card — fills the entire content area */}
            <div className="min-h-full overflow-hidden flex flex-col relative">

              {/* Action Bar — Login/Logout/Break + Work Duration */}
              <div className="dash-actions px-8 py-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {!isTimedIn ? (
                      <button
                        onClick={handleOpenCheckInModal}
                        className="px-5 py-2.5 bg-green-600 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 text-sm hover:bg-green-700 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Login</span>
                        </div>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleOpenCheckOutModal}
                          className="px-5 py-2.5 bg-red-600 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 text-sm hover:bg-red-700 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                          style={{ fontFamily: 'var(--font-geist-sans)' }}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Logout</span>
                          </div>
                        </button>

                        {!isOnBreak && (
                          <button
                            onClick={handleStartBreak}
                            className="px-5 py-2.5 bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 text-sm hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                            style={{ fontFamily: 'var(--font-geist-sans)' }}
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Break</span>
                            </div>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Work Duration Display */}
                  {isTimedIn && (
                    <div className="flex items-center space-x-5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/60" style={{ fontFamily: 'var(--font-geist-sans)', letterSpacing: '0.1em' }}>
                          Duration
                        </span>
                        <span className="text-xl font-bold tabular-nums text-white" style={{ fontFamily: 'var(--font-geist-mono)', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                          {(workDuration / 3600).toFixed(2)} hrs
                        </span>
                      </div>
                      {checkInTime && (
                        <div className="text-xs text-white/50">
                          In at{' '}
                          <span className="font-bold text-white/80">
                            {new Date(checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Row — Edge Glow cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 py-4 relative z-10">
                {/* Login Status */}
                <div className="dash-stat flex items-center gap-4" style={{
                  padding: '20px 24px',
                                  }}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isTimedIn ? 'bg-green-400 gw-status-breathe' : 'bg-white/30'}`} />
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Login Status</p>
                    <p className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--font-geist-mono)', color: isTimedIn ? '#86efac' : 'rgba(255,255,255,0.6)', textShadow: isTimedIn ? '0 0 20px rgba(134,239,172,0.4)' : 'none' }}>
                      {isTimedIn ? 'Logged In' : 'Not Logged In'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>
                      {isTimedIn ? `Since ${new Date(checkInTime!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Click Login to start'}
                    </p>
                  </div>
                </div>

                {/* Active Tasks */}
                <div className="dash-stat flex items-center gap-4" style={{
                  padding: '20px 24px',
                                  }}>
                  <div className="flex-1">
                    <p style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Active Tasks</p>
                    <p className="text-3xl font-bold text-white mt-1" style={{ fontFamily: 'var(--font-geist-mono)', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{todayStats.activeTasks}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>Tasks for today</p>
                  </div>
                  {isTimedIn && (
                    <button
                      onClick={handleCopyReportFromHome}
                      className="p-2 rounded-lg transition-colors group hover:bg-white/10"
                      title="Copy report to clipboard"
                    >
                      {homeReportCopied ? (
                        <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>

                {/* Hours Today */}
                <div className="dash-stat flex items-center gap-4" style={{
                  padding: '20px 24px',
                                  }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Hours Today</p>
                    <p className="text-3xl font-bold text-white mt-1" style={{ fontFamily: 'var(--font-geist-mono)', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{todayStats.hoursToday}h</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>Total hours worked</p>
                  </div>
                </div>
              </div>
              {/* Announcements + Tasks — bottom section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-8 py-6 flex-1 relative z-10">
                {/* Announcements */}
                <div className="dash-section">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase flex items-center" style={{ letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)' }}>
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Announcements
                    </h2>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setShowCreateAnnouncementModal(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create</span>
                      </button>
                    )}
                  </div>
                  {isLoadingAnnouncements ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm">No announcements</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          style={{
                            borderLeft: announcement.priority === 'urgent' ? '3px solid #ef4444' : announcement.priority === 'high' ? '3px solid #f97316' : '3px solid rgba(56,189,248,0.4)',
                            paddingLeft: '16px',
                            paddingBottom: '16px',
                            marginBottom: '4px',
                                                      }}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-sm" style={{ color: '#fff' }}>{announcement.title}</h3>
                            {announcement.priority === 'urgent' && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Urgent</span>
                            )}
                          </div>
                          <p className="text-sm mb-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{announcement.content}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Tasks */}
                <div className="dash-section">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase flex items-center" style={{ letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)' }}>
                      <svg className="w-4 h-4 mr-2" style={{ color: '#4ade80' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Active Tasks
                    </h2>
                    <button
                      onClick={() => router.push('/dashboard/tasks')}
                      className="text-xs font-medium" style={{ color: '#7dd3fc' }}
                    >
                      View All
                    </button>
                  </div>
                  {dashboardTasks.length === 0 ? (
                    <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm">No active tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                      {dashboardTasks.map((task, index) => (
                        <div key={task.id} style={{
                          paddingBottom: '16px', marginBottom: '4px',
                                                  }}>
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5" style={{ background: '#4ade80', color: '#052e16' }}>
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm" style={{ color: '#fff' }}>{task.title}</h4>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{
                                  background: task.status === 'in_progress' ? 'rgba(56,189,248,0.2)' : task.status === 'pending' ? 'rgba(255,255,255,0.1)' : 'rgba(74,222,128,0.2)',
                                  color: task.status === 'in_progress' ? '#7dd3fc' : task.status === 'pending' ? 'rgba(255,255,255,0.5)' : '#86efac',
                                  border: `1px solid ${task.status === 'in_progress' ? 'rgba(56,189,248,0.3)' : task.status === 'pending' ? 'rgba(255,255,255,0.15)' : 'rgba(74,222,128,0.3)'}`,
                                }}>
                                  {task.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {task.priority && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{
                                    background: task.priority === 'high' || task.priority === 'urgent' ? 'rgba(239,68,68,0.2)' : task.priority === 'medium' ? 'rgba(251,146,60,0.2)' : 'rgba(255,255,255,0.1)',
                                    color: task.priority === 'high' || task.priority === 'urgent' ? '#fca5a5' : task.priority === 'medium' ? '#fdba74' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${task.priority === 'high' || task.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : task.priority === 'medium' ? 'rgba(251,146,60,0.3)' : 'rgba(255,255,255,0.15)'}`,
                                  }}>
                                    {task.priority.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {task.subTasks && task.subTasks.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {task.subTasks.map((sub) => (
                                    <div key={sub.id} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                      <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0" style={{
                                        background: sub.status === 'completed' ? '#4ade80' : 'transparent',
                                        border: sub.status === 'completed' ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                                        color: sub.status === 'completed' ? '#052e16' : 'inherit',
                                      }}>
                                        {sub.status === 'completed' && (
                                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </span>
                                      <span style={{ textDecoration: sub.status === 'completed' ? 'line-through' : 'none', color: sub.status === 'completed' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }}>{sub.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
      </div>

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-2xl font-bold text-white">Start of Day Login</h2>
              <p className="text-green-50 text-sm mt-1">Review your tasks and confirm login. Report will be copied to clipboard.</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Tasks</h3>
                      <button
                        onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Task</span>
                      </button>
                    </div>

                    {/* Edit Task Form */}
                    {showEditTaskForm && (
                      <div className="mb-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                        <h4 className="font-semibold text-gray-900 mb-3">Edit Task</h4>
                        <div className="space-y-3">
                          {/* Project/Main Task Title */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project/Main Task Title</label>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              placeholder="e.g., GoWater Dispenser"
                            />
                          </div>

                          {/* Sub-tasks */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">Sub-tasks</label>
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
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Sub-task</span>
                              </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {newTask.subTasks.map((subTask, index) => (
                                <div key={subTask.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-semibold text-gray-700">{index + 1}.</span>
                                    <input
                                      type="text"
                                      value={subTask.title}
                                      onChange={(e) => {
                                        const updated = [...newTask.subTasks];
                                        updated[index].title = e.target.value;
                                        setNewTask({ ...newTask, subTasks: updated });
                                      }}
                                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Sub-task title..."
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = newTask.subTasks.filter((_, i) => i !== index);
                                        setNewTask({ ...newTask, subTasks: updated });
                                      }}
                                      className="p-1 hover:bg-red-100 rounded text-red-500"
                                      title="Remove"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {newTask.subTasks.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                                  No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                            <div className="grid grid-cols-4 gap-2">
                              {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                                <button
                                  key={priority}
                                  type="button"
                                  onClick={() => setNewTask({ ...newTask, priority })}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                    newTask.priority === priority
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleUpdateTask}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => {
                                setShowEditTaskForm(false);
                                setEditingTask(null);
                                setNewTask({ title: '', subTasks: [], priority: 'medium' });
                              }}
                              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add Task Form */}
                    {showAddTaskForm && (
                      <div className="mb-4 p-4 border-2 border-green-200 rounded-lg bg-green-50">
                        <h4 className="font-semibold text-gray-900 mb-3">Add New Task</h4>
                        <div className="space-y-3">
                          {/* Project/Main Task Title */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project/Main Task Title</label>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              placeholder="e.g., GoWater Dispenser"
                            />
                          </div>

                          {/* Sub-tasks */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">Sub-tasks</label>
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
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Sub-task</span>
                              </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {newTask.subTasks.map((subTask, index) => (
                                <div key={subTask.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-semibold text-gray-700">{index + 1}.</span>
                                    <input
                                      type="text"
                                      value={subTask.title}
                                      onChange={(e) => {
                                        const updated = [...newTask.subTasks];
                                        updated[index].title = e.target.value;
                                        setNewTask({ ...newTask, subTasks: updated });
                                      }}
                                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Sub-task title..."
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = newTask.subTasks.filter((_, i) => i !== index);
                                        setNewTask({ ...newTask, subTasks: updated });
                                      }}
                                      className="p-1 hover:bg-red-100 rounded text-red-500"
                                      title="Remove"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {newTask.subTasks.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                                  No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                            <div className="grid grid-cols-4 gap-2">
                              {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                                <button
                                  key={priority}
                                  type="button"
                                  onClick={() => setNewTask({ ...newTask, priority })}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                    newTask.priority === priority
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleCreateTask}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                              Add Task
                            </button>
                            <button
                              onClick={() => {
                                setShowAddTaskForm(false);
                                setNewTask({ title: '', subTasks: [], priority: 'medium' });
                              }}
                              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {checkInTasks.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">No tasks for today</h4>
                            <p className="text-sm text-yellow-700 mt-1">You can still login, but consider adding tasks to track your progress.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checkInTasks.map((task, index) => (
                          <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    task.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {task.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {task.priority && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.priority.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-3 flex items-center space-x-2">
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit task"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete task"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={handleCopyCheckInReport}
                  disabled={
                    isLoadingTasks ||
                    checkInTasks.length === 0
                  }
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {checkInCopied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleConfirmLogin}
                  disabled={
                    isLoadingTasks ||
                    checkInTasks.length === 0
                  }
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Confirm Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Location Selection Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg font-bold text-white">Select Work Location</h2>
              <p className="text-blue-100 text-sm mt-0.5">Where are you working today?</p>
            </div>

            {/* Location Options */}
            <div className="p-5 space-y-3">
              <button
                onClick={() => handleLocationSelect('WFH')}
                className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-600">WFH</p>
                  <p className="text-sm text-gray-500">Work From Home</p>
                </div>
              </button>

              <button
                onClick={() => handleLocationSelect('Onsite')}
                className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 group-hover:text-green-600">Onsite</p>
                  <p className="text-sm text-gray-500">Office Location</p>
                </div>
              </button>

              <button
                onClick={() => handleLocationSelect('Field')}
                className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 group-hover:text-orange-600">Field</p>
                  <p className="text-sm text-gray-500">On-site / Client Location</p>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Copied Confirmation Modal */}
      {showReportCopiedModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Modal Content */}
            <div className="p-6 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">Report Copied!</h2>

              {/* Message */}
              <p className="text-gray-600 mb-4">
                Your Start of Day Report has been copied to clipboard.
              </p>

              {/* WhatsApp Instruction */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-green-700 font-medium">Next Step</span>
                </div>
                <p className="text-green-800 text-sm">
                  Paste it on WhatsApp <span className="font-semibold">GoWater Employee Updates</span> channel
                </p>
              </div>

              {/* Got it Button */}
              <button
                onClick={handleDismissReportCopiedModal}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EOD Report Copied Confirmation Modal */}
      {showEodReportCopiedModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Modal Content */}
            <div className="p-6 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">Report Copied!</h2>

              {/* Message */}
              <p className="text-gray-600 mb-4">
                Your End of Day Report has been copied to clipboard.
              </p>

              {/* WhatsApp Instruction */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-red-700 font-medium">Next Step</span>
                </div>
                <p className="text-red-800 text-sm">
                  Paste it on WhatsApp <span className="font-semibold">GoWater Employee Updates</span> channel
                </p>
              </div>

              {/* Got it Button */}
              <button
                onClick={handleDismissEodReportCopiedModal}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
              <h2 className="text-2xl font-bold text-white">End of Day Logout</h2>
              <p className="text-red-50 text-sm mt-1">Update task statuses and confirm logout. Report will be copied to clipboard.</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingCheckOutTasks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <>
                  {/* Hours Worked Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Hours Worked Today</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-1">{(workDuration / 3600).toFixed(2)} hrs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Login: {checkInTime ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                        <p className="text-sm text-gray-600">Logout: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Task Updates</h3>
                      <div className="text-sm text-gray-500">
                        {checkOutTasks.filter(t => t.status === 'completed').length} / {checkOutTasks.length} completed
                      </div>
                    </div>

                    {checkOutTasks.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">No tasks for today</h4>
                            <p className="text-sm text-yellow-700 mt-1">You can still logout and send your end-of-day report.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checkOutTasks.map((task, taskIndex) => (
                          <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start flex-1">
                                <span className="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                  {taskIndex + 1}
                                </span>
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                              </div>
                              <div className={`px-3 py-2 border rounded-lg text-sm font-bold ${getStatusBadgeClass(task.status as 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived')}`}>
                                {getStatusLabel(task.status as 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived')}
                              </div>
                            </div>

                            {/* Sub-tasks */}
                            {task.subTasks && task.subTasks.length > 0 && (
                              <div className="ml-9 space-y-2">
                                {task.subTasks.map((subTask, subIndex) => (
                                  <div key={subTask.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                    <div className="flex items-start space-x-3">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <label className="text-sm font-semibold text-gray-900">
                                            {subTask.title}
                                          </label>
                                          <select
                                            value={subTask.status}
                                            onChange={(e) => {
                                              const updatedTasks = [...checkOutTasks];
                                              const taskIdx = updatedTasks.findIndex(t => t.id === task.id);
                                              if (taskIdx !== -1 && updatedTasks[taskIdx].subTasks) {
                                                // Update subtask status
                                                updatedTasks[taskIdx].subTasks![subIndex].status = e.target.value as 'pending' | 'in_progress' | 'completed' | 'cancel';

                                                // Auto-calculate main task status based on subtasks
                                                const mainTask = updatedTasks[taskIdx];
                                                const newMainStatus = calculateTaskStatus(
                                                  mainTask.subTasks!,
                                                  mainTask.status as 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived'
                                                );
                                                updatedTasks[taskIdx].status = newMainStatus;

                                                setCheckOutTasks(updatedTasks);
                                              }
                                            }}
                                            className={`px-2 py-1 border rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                              subTask.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                                              subTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                              subTask.status === 'cancel' ? 'bg-red-100 text-red-800 border-red-300' :
                                              'bg-gray-100 text-gray-800 border-gray-300'
                                            }`}
                                          >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancel">Cancel</option>
                                          </select>
                                        </div>
                                        <textarea
                                          value={subTask.notes || ''}
                                          onChange={(e) => {
                                            const updatedTasks = [...checkOutTasks];
                                            const taskIdx = updatedTasks.findIndex(t => t.id === task.id);
                                            if (taskIdx !== -1 && updatedTasks[taskIdx].subTasks) {
                                              updatedTasks[taskIdx].subTasks![subIndex].notes = e.target.value;
                                              setCheckOutTasks(updatedTasks);
                                            }
                                          }}
                                          placeholder="Add details about what was done..."
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          When you click &quot;Send Report & Logout&quot;, a WhatsApp message with your end-of-day report including task updates and hours worked will be prepared.
                          After sending, you&apos;ll be automatically logged out.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoadingCheckOutTasks}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirm Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Modal */}
      {isOnBreak && breakStartTime && (
        <BreakModal
          isOpen={isOnBreak}
          breakStartTime={breakStartTime}
          onEndBreak={handleEndBreak}
        />
      )}

      {/* Create Announcement Modal */}
      {showCreateAnnouncementModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">Create Announcement</h2>
              <p className="text-blue-50 text-sm mt-1">Share important updates with the team</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Team Meeting Tomorrow"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                    placeholder="Write your announcement here..."
                    rows={4}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'normal', 'high', 'urgent'] as const).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setNewAnnouncement({ ...newAnnouncement, priority })}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          newAnnouncement.priority === priority
                            ? priority === 'urgent' ? 'bg-red-600 text-white shadow-md' :
                              priority === 'high' ? 'bg-orange-600 text-white shadow-md' :
                              priority === 'normal' ? 'bg-blue-600 text-white shadow-md' :
                              'bg-gray-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['all', 'managers', 'employees'] as const).map((audience) => (
                      <button
                        key={audience}
                        type="button"
                        onClick={() => setNewAnnouncement({ ...newAnnouncement, target_audience: audience })}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          newAnnouncement.target_audience === audience
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {audience === 'all' ? 'Everyone' : audience.charAt(0).toUpperCase() + audience.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration Date (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank for no expiration</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateAnnouncementModal(false);
                  setNewAnnouncement({
                    title: '',
                    content: '',
                    priority: 'normal',
                    target_audience: 'all',
                    expires_at: ''
                  });
                }}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnouncement}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Create Announcement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
