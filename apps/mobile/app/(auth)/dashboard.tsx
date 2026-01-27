import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { attendanceService } from '../../src/services/attendance';
import { tasksService, Task, SubTask } from '../../src/services/tasks';

type WorkLocation = 'WFH' | 'Onsite' | 'Field';

interface CheckInTask {
  id: string;
  title: string;
  description?: string;
  status: Task['status'];
  priority: Task['priority'];
  subTasks: SubTask[];
}

interface NewSubTask {
  id: string;
  title: string;
  notes: string;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportType, setReportType] = useState<'start' | 'end'>('start');

  // Tasks for check-out (with editable status)
  const [checkOutTasks, setCheckOutTasks] = useState<CheckInTask[]>([]);

  // Tasks for check-in
  const [checkInTasks, setCheckInTasks] = useState<CheckInTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newSubTasks, setNewSubTasks] = useState<NewSubTask[]>([]);

  const [attendanceStatus, setAttendanceStatus] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    checkOutTime?: string;
    isOnBreak: boolean;
    workLocation?: WorkLocation;
    totalHours: number;
    breakDuration?: number;
  }>({
    isCheckedIn: false,
    isOnBreak: false,
    totalHours: 0,
  });

  const fetchAttendanceStatus = useCallback(async () => {
    try {
      const status = await attendanceService.getTodayStatus();
      setAttendanceStatus(status);
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAttendanceStatus();
  }, [fetchAttendanceStatus]);

  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const tasks = await tasksService.getTasks();
      const incompleteTasks = tasks.filter(task =>
        task.status !== 'archived' && task.status !== 'completed'
      ).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subTasks: (task.subTasks || []).filter(st => !st.completed),
      }));
      setCheckInTasks(incompleteTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceStatus();
    }, [fetchAttendanceStatus])
  );

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const openCheckInModal = () => {
    fetchTasks();
    setShowCheckInModal(true);
  };

  const handleProceedToLocation = () => {
    setShowCheckInModal(false);
    setShowLocationModal(true);
  };

  const handleCheckIn = async (location: WorkLocation) => {
    setShowLocationModal(false);
    setIsProcessing(true);

    try {
      const result = await attendanceService.checkIn(location);
      if (result.success) {
        await fetchAttendanceStatus();
        const report = generateStartReport(location);
        setReportContent(report);
        setShowReportModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to check in');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusTag = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': '[PENDING]',
      'in_progress': '[IN PROGRESS]',
      'completed': '[COMPLETED]',
      'cancel': '[CANCELED]',
      'blocked': '[BLOCKED]',
    };
    return statusMap[status] || `[${status.toUpperCase()}]`;
  };

  const getSubTaskStatusText = (completed: boolean): string => {
    return completed ? 'Done' : 'Pending';
  };

  const generateStartReport = (location: WorkLocation) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GoWater Start of Day Report

Date: ${date}
Employee: ${user?.employeeName || user?.name || 'N/A'}
Position: ${user?.role || 'N/A'}
Work Arrangement: ${location}
Login Time: ${time}
Logout Time: N/A
Hours Worked: 0.00 hours
Break Time: 0m

Today's Planned Tasks:`;

    if (checkInTasks.length === 0) {
      report += '\nNo tasks planned for today.';
    } else {
      checkInTasks.forEach((task, index) => {
        report += `\n${index + 1}. ${task.title} ${getStatusTag(task.status)}`;
        if (task.subTasks && task.subTasks.length > 0) {
          task.subTasks.forEach((subTask) => {
            report += `\n   ${subTask.title} [${getSubTaskStatusText(subTask.completed)}]`;
            if (subTask.notes) {
              report += `\n   [${subTask.notes}]`;
            }
          });
        }
      });
    }

    return report;
  };

  const copyReportToClipboard = async () => {
    await Clipboard.setStringAsync(reportContent);
    Alert.alert('Copied!', 'Report copied to clipboard. Paste it in WhatsApp.');
    setShowReportModal(false);
  };

  // Check-out flow
  const openCheckOutModal = async () => {
    setIsLoadingTasks(true);
    setShowCheckOutModal(true);
    try {
      const tasks = await tasksService.getTasks();
      const incompleteTasks = tasks.filter(task =>
        task.status !== 'archived'
      ).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subTasks: (task.subTasks || []).map(st => ({
          ...st,
          status: st.completed ? 'completed' : 'pending',
        })),
      }));
      setCheckOutTasks(incompleteTasks as CheckInTask[]);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setCheckOutTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  const updateSubTaskStatus = (taskId: string, subTaskId: string, completed: boolean) => {
    setCheckOutTasks(prev =>
      prev.map(task => {
        if (task.id !== taskId) return task;
        const updatedSubTasks = task.subTasks.map(st =>
          st.id === subTaskId ? { ...st, completed } : st
        );
        // Auto-calculate main task status based on subtasks
        const allCompleted = updatedSubTasks.every(st => st.completed);
        const someCompleted = updatedSubTasks.some(st => st.completed);
        let newStatus = task.status;
        if (allCompleted && updatedSubTasks.length > 0) {
          newStatus = 'completed';
        } else if (someCompleted) {
          newStatus = 'in_progress';
        }
        return { ...task, subTasks: updatedSubTasks, status: newStatus };
      })
    );
  };

  const updateSubTaskNotes = (taskId: string, subTaskId: string, notes: string) => {
    setCheckOutTasks(prev =>
      prev.map(task => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          subTasks: task.subTasks.map(st =>
            st.id === subTaskId ? { ...st, notes } : st
          ),
        };
      })
    );
  };

  const formatBreakTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const generateEODReport = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GoWater End of Day Report

Date: ${date}
Employee: ${user?.employeeName || user?.name || 'N/A'}
Position: ${user?.role || 'N/A'}
Work Arrangement: ${attendanceStatus.workLocation || 'N/A'}
Login Time: ${attendanceStatus.checkInTime || 'N/A'}
Logout Time: ${time}
Hours Worked: ${attendanceStatus.totalHours.toFixed(2)} hours
Break Time: ${formatBreakTime(attendanceStatus.breakDuration || 0)}

Today's Task Updates:`;

    if (checkOutTasks.length === 0) {
      report += '\nNo tasks worked on today.';
    } else {
      checkOutTasks.forEach((task, index) => {
        report += `\n${index + 1}. ${task.title} ${getStatusTag(task.status)}`;
        if (task.subTasks && task.subTasks.length > 0) {
          task.subTasks.forEach((subTask) => {
            report += `\n   ${subTask.title} [${getSubTaskStatusText(subTask.completed)}]`;
            if (subTask.notes) {
              report += `\n   [${subTask.notes}]`;
            }
          });
        }
      });
    }

    return report;
  };

  const handleConfirmCheckOut = async () => {
    setIsProcessing(true);
    try {
      // Save task updates to server
      for (const task of checkOutTasks) {
        await tasksService.updateTask(task.id, {
          status: task.status,
          subTasks: task.subTasks,
        });
      }

      // Generate and copy report
      const report = generateEODReport();
      await Clipboard.setStringAsync(report);

      // Call checkout API
      const result = await attendanceService.checkOut();
      if (result.success) {
        await fetchAttendanceStatus();
        setShowCheckOutModal(false);
        setReportContent(report);
        setReportType('end');
        setShowReportModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to check out');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setIsProcessing(true);
    try {
      const subTasksToSave = newSubTasks
        .filter(st => st.title.trim())
        .map(st => ({
          id: st.id,
          title: st.title.trim(),
          notes: st.notes?.trim() || '',
          completed: false,
        }));

      const result = await tasksService.createTask({
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: 'pending',
        subTasks: subTasksToSave,
      });

      if (result.success) {
        setNewTaskTitle('');
        setNewTaskPriority('medium');
        setNewSubTasks([]);
        setShowAddTaskModal(false);
        await fetchTasks();
        setTimeout(() => setShowCheckInModal(true), 100);
        Alert.alert('Success', 'Task created successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const addSubTask = () => {
    setNewSubTasks([
      ...newSubTasks,
      { id: `temp-${Date.now()}`, title: '', notes: '' },
    ]);
  };

  const updateSubTask = (id: string, field: 'title' | 'notes', value: string) => {
    setNewSubTasks(
      newSubTasks.map(st => (st.id === id ? { ...st, [field]: value } : st))
    );
  };

  const removeSubTask = (id: string) => {
    setNewSubTasks(newSubTasks.filter(st => st.id !== id));
  };

  // Helper functions for colors
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fef3c7';
      case 'in_progress': return '#dbeafe';
      case 'completed': return '#dcfce7';
      case 'cancel': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'pending': return '#d97706';
      case 'in_progress': return '#2563eb';
      case 'completed': return '#16a34a';
      case 'cancel': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#9ca3af';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeCard}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.employeeName || user?.name}</Text>
        <Text style={styles.employeeId}>{user?.employeeId}</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusCard, attendanceStatus.isCheckedIn ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>
            {attendanceStatus.isCheckedIn
              ? attendanceStatus.isOnBreak
                ? 'On Break'
                : 'Working'
              : 'Not Checked In'}
          </Text>
          {attendanceStatus.checkInTime && (
            <Text style={styles.statusTime}>Since {attendanceStatus.checkInTime}</Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {!attendanceStatus.isCheckedIn ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton]}
            onPress={openCheckInModal}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.actionButtonText, styles.checkInButtonText]}>Check In</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkOutButton]}
            onPress={openCheckOutModal}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.actionButtonText, styles.checkOutButtonText]}>Check Out</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(auth)/tasks')}
        >
          <Text style={styles.actionButtonText}>View Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Check-In Modal with Tasks */}
      <Modal
        visible={showCheckInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Start of Day Login</Text>
            <Text style={styles.modalHeaderSubtitle}>Review tasks and confirm login</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Add Task Button */}
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => {
                setShowCheckInModal(false);
                setTimeout(() => setShowAddTaskModal(true), 100);
              }}
            >
              <Text style={styles.addTaskButtonText}>+ Add New Task</Text>
            </TouchableOpacity>

            {/* Tasks List */}
            {isLoadingTasks ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 24 }} />
            ) : checkInTasks.length === 0 ? (
              <View style={styles.emptyTasks}>
                <Text style={styles.emptyTasksText}>No tasks planned for today</Text>
                <Text style={styles.emptyTasksSubtext}>Add a task to get started</Text>
              </View>
            ) : (
              checkInTasks.map((task, index) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskNumberContainer}>
                      <Text style={styles.taskNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={styles.taskBadges}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(task.status) }]}>
                          <Text style={[styles.statusBadgeText, { color: getStatusTextColor(task.status) }]}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityBgColor(task.priority) }]}>
                          <Text style={styles.priorityBadgeText}>{task.priority.toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {task.subTasks && task.subTasks.length > 0 && (
                    <View style={styles.subTasksContainer}>
                      {task.subTasks.map((subTask) => (
                        <View key={subTask.id} style={styles.subTaskItem}>
                          <Text style={styles.subTaskBullet}>•</Text>
                          <View style={styles.subTaskContent}>
                            <Text style={styles.subTaskTitle}>{subTask.title}</Text>
                            {subTask.notes && (
                              <Text style={styles.subTaskNotes}>{subTask.notes}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowCheckInModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleProceedToLocation}
            >
              <Text style={styles.confirmButtonText}>Confirm Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        animationType="slide"
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Add New Task</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter task title..."
              placeholderTextColor="#6b7280"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityOptions}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    newTaskPriority === p && styles.priorityOptionActive,
                    { backgroundColor: newTaskPriority === p ? getPriorityBgColor(p) : '#1a2332' }
                  ]}
                  onPress={() => setNewTaskPriority(p)}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    newTaskPriority === p && styles.priorityOptionTextActive
                  ]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.subTasksSection}>
              <View style={styles.subTasksHeader}>
                <Text style={styles.inputLabel}>Sub-tasks</Text>
                <TouchableOpacity onPress={addSubTask}>
                  <Text style={styles.addSubTaskText}>+ Add Sub-task</Text>
                </TouchableOpacity>
              </View>

              {newSubTasks.map((subTask, index) => (
                <View key={subTask.id} style={styles.newSubTaskItem}>
                  <Text style={styles.subTaskIndex}>{index + 1}.</Text>
                  <View style={styles.subTaskInputs}>
                    <TextInput
                      style={styles.subTaskTitleInput}
                      placeholder="Sub-task title"
                      placeholderTextColor="#6b7280"
                      value={subTask.title}
                      onChangeText={(text) => updateSubTask(subTask.id, 'title', text)}
                    />
                    <TextInput
                      style={styles.subTaskNotesInput}
                      placeholder="Notes (optional)"
                      placeholderTextColor="#6b7280"
                      value={subTask.notes}
                      onChangeText={(text) => updateSubTask(subTask.id, 'notes', text)}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeSubTaskButton}
                    onPress={() => removeSubTask(subTask.id)}
                  >
                    <Text style={styles.removeSubTaskText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setNewTaskTitle('');
                setNewTaskPriority('medium');
                setNewSubTasks([]);
                setShowAddTaskModal(false);
                setTimeout(() => setShowCheckInModal(true), 100);
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, isProcessing && styles.buttonDisabled]}
              onPress={handleAddTask}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Add Task</Text>
              )}
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Work Location</Text>

            {(['WFH', 'Onsite', 'Field'] as WorkLocation[]).map((location) => (
              <TouchableOpacity
                key={location}
                style={styles.locationOption}
                onPress={() => handleCheckIn(location)}
              >
                <Text style={styles.locationOptionText}>
                  {location === 'WFH' ? 'Work From Home' : location}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalContent}>
            <Text style={styles.modalTitle}>
              {reportType === 'end' ? 'End of Day Report' : 'Copy Report to WhatsApp'}
            </Text>

            <ScrollView style={styles.reportPreview}>
              <Text style={styles.reportText}>{reportContent}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyReportToClipboard}
            >
              <Text style={styles.copyButtonText}>COPY TO CLIPBOARD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check Out Modal */}
      <Modal
        visible={showCheckOutModal}
        animationType="slide"
        onRequestClose={() => setShowCheckOutModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <View style={[styles.modalHeader, styles.checkOutModalHeader]}>
            <Text style={styles.modalHeaderTitle}>End of Day Logout</Text>
            <Text style={styles.modalHeaderSubtitle}>Update task statuses and confirm logout</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Hours Worked */}
            <View style={styles.hoursWorkedCard}>
              <Text style={styles.hoursWorkedLabel}>Hours Worked Today</Text>
              <Text style={styles.hoursWorkedValue}>{attendanceStatus.totalHours.toFixed(2)} hrs</Text>
              <View style={styles.hoursWorkedTimes}>
                <Text style={styles.hoursWorkedTime}>Login: {attendanceStatus.checkInTime || 'N/A'}</Text>
                <Text style={styles.hoursWorkedTime}>Break: {formatBreakTime(attendanceStatus.breakDuration || 0)}</Text>
              </View>
            </View>

            {/* Tasks List */}
            <Text style={styles.checkOutSectionTitle}>Today's Task Updates</Text>

            {isLoadingTasks ? (
              <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 24 }} />
            ) : checkOutTasks.length === 0 ? (
              <View style={styles.emptyTasks}>
                <Text style={styles.emptyTasksText}>No tasks for today</Text>
                <Text style={styles.emptyTasksSubtext}>You can still logout and send your end-of-day report</Text>
              </View>
            ) : (
              checkOutTasks.map((task, index) => (
                <View key={task.id} style={styles.checkOutTaskCard}>
                  <View style={styles.taskHeader}>
                    <View style={[styles.taskNumberContainer, styles.checkOutTaskNumber]}>
                      <Text style={styles.taskNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {/* Task Status Selector */}
                      <View style={styles.statusSelector}>
                        {(['pending', 'in_progress', 'completed'] as const).map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusOption,
                              task.status === status && {
                                backgroundColor: getStatusBgColor(status),
                                borderColor: getStatusTextColor(status),
                              },
                            ]}
                            onPress={() => updateTaskStatus(task.id, status)}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                task.status === status && { color: getStatusTextColor(status) },
                              ]}
                            >
                              {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Subtasks */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <View style={styles.checkOutSubTasks}>
                      {task.subTasks.map((subTask) => (
                        <View key={subTask.id} style={styles.checkOutSubTaskItem}>
                          <TouchableOpacity
                            style={styles.checkOutSubTaskCheckbox}
                            onPress={() => updateSubTaskStatus(task.id, subTask.id, !subTask.completed)}
                          >
                            <View style={[
                              styles.checkbox,
                              subTask.completed && styles.checkboxChecked,
                            ]}>
                              {subTask.completed && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={[
                              styles.checkOutSubTaskTitle,
                              subTask.completed && styles.checkOutSubTaskCompleted,
                            ]}>
                              {subTask.title}
                            </Text>
                          </TouchableOpacity>
                          <TextInput
                            style={styles.subTaskNotesInput}
                            placeholder="Add notes..."
                            placeholderTextColor="#6b7280"
                            value={subTask.notes || ''}
                            onChangeText={(text) => updateSubTaskNotes(task.id, subTask.id, text)}
                            multiline
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowCheckOutModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkOutConfirmButton, isProcessing && styles.buttonDisabled]}
              onPress={handleConfirmCheckOut}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Logout</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1824',
  },
  welcomeCard: {
    backgroundColor: '#1a2332',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  greeting: {
    color: '#9ca3af',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  employeeId: {
    color: '#3b82f6',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  statusContainer: {
    paddingHorizontal: 16,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusTime: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#1a2332',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkInButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkInButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkOutButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  checkOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 24,
  },
  logoutButtonText: {
    color: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Full Screen Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#0f1824',
  },
  modalHeader: {
    backgroundColor: '#22c55e',
    padding: 20,
    paddingTop: 50,
  },
  modalHeaderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalHeaderSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  cancelModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Add Task Button
  addTaskButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty Tasks
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTasksText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTasksSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },

  // Task Card
  taskCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Subtasks
  subTasksContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  subTaskItem: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  subTaskBullet: {
    color: '#9ca3af',
    fontSize: 14,
    marginRight: 8,
  },
  subTaskContent: {
    flex: 1,
  },
  subTaskTitle: {
    color: '#d1d5db',
    fontSize: 14,
  },
  subTaskNotes: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Add Task Form
  inputLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  priorityOptionActive: {
    borderColor: 'transparent',
  },
  priorityOptionText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityOptionTextActive: {
    color: '#fff',
  },

  // Subtasks section in add form
  subTasksSection: {
    marginTop: 24,
  },
  subTasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addSubTaskText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  newSubTaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 12,
  },
  subTaskIndex: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 12,
  },
  subTaskInputs: {
    flex: 1,
    gap: 8,
  },
  subTaskTitleInput: {
    backgroundColor: '#0f1824',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  subTaskNotesInput: {
    backgroundColor: '#0f1824',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  removeSubTaskButton: {
    padding: 8,
    marginLeft: 8,
  },
  removeSubTaskText: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Location Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  locationOption: {
    backgroundColor: '#0f1824',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  locationOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },

  // Report Modal
  reportModalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  reportPreview: {
    backgroundColor: '#0f1824',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    maxHeight: 300,
  },
  reportText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },

  // Check Out Modal Styles
  checkOutModalHeader: {
    backgroundColor: '#ef4444',
  },
  checkOutConfirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  hoursWorkedCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  hoursWorkedLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hoursWorkedValue: {
    color: '#3b82f6',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  hoursWorkedTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  hoursWorkedTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  checkOutSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkOutTaskCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  checkOutTaskNumber: {
    backgroundColor: '#ef4444',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#0f1824',
  },
  statusOptionText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  checkOutSubTasks: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  checkOutSubTaskItem: {
    marginBottom: 12,
  },
  checkOutSubTaskCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6b7280',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkOutSubTaskTitle: {
    color: '#d1d5db',
    fontSize: 14,
    flex: 1,
  },
  checkOutSubTaskCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  subTaskNotesInput: {
    backgroundColor: '#0f1824',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 13,
    marginLeft: 32,
    minHeight: 40,
  },
});
