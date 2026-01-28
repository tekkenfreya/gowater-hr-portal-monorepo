import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { attendanceService } from '../../src/services/attendance';
import { tasksService, Task, SubTask } from '../../src/services/tasks';
import { useAuth } from '../../src/contexts/AuthContext';

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

export default function AttendanceScreen() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<WorkLocation | null>(null);

  // Tasks for check-in
  const [checkInTasks, setCheckInTasks] = useState<CheckInTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newSubTasks, setNewSubTasks] = useState<NewSubTask[]>([]);

  const [attendanceData, setAttendanceData] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    checkOutTime?: string;
    isOnBreak: boolean;
    breakStartTime?: string;
    workLocation?: WorkLocation;
    totalHours: number;
    breakDuration?: number;
  }>({
    isCheckedIn: false,
    isOnBreak: false,
    totalHours: 0,
  });

  const fetchAttendanceData = useCallback(async () => {
    try {
      const data = await attendanceService.getTodayStatus();
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        fetchAttendanceData();
      }
    }, [fetchAttendanceData, isLoading])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const tasks = await tasksService.getTasks();
      // Filter to show only incomplete tasks (not archived, not completed)
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
    setSelectedLocation(location);
    setIsProcessing(true);

    try {
      const result = await attendanceService.checkIn(location);
      if (result.success) {
        await fetchAttendanceData();
        // Generate and show report with tasks
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

  const handleCheckOut = async () => {
    // First fetch tasks for EOD report
    await fetchTasks();

    Alert.alert(
      'Confirm Check Out',
      'Are you sure you want to check out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const result = await attendanceService.checkOut();
              if (result.success) {
                await fetchAttendanceData();
                // Generate EOD report with tasks
                const report = generateEODReport();
                setReportContent(report);
                setShowReportModal(true);
              } else {
                Alert.alert('Error', result.error || 'Failed to check out');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleBreakToggle = async () => {
    setIsProcessing(true);
    try {
      const result = attendanceData.isOnBreak
        ? await attendanceService.endBreak()
        : await attendanceService.startBreak();

      if (result.success) {
        await fetchAttendanceData();
      } else {
        Alert.alert('Error', result.error || 'Failed to toggle break');
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

  const formatBreakTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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

  const generateEODReport = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GoWater End of Day Report

Date: ${date}
Employee: ${user?.employeeName || user?.name || 'N/A'}
Position: ${user?.role || 'N/A'}
Work Arrangement: ${attendanceData.workLocation || 'N/A'}
Login Time: ${attendanceData.checkInTime || 'N/A'}
Logout Time: ${time}
Hours Worked: ${attendanceData.totalHours.toFixed(2)} hours
Break Time: ${formatBreakTime(attendanceData.breakDuration || 0)}

Today's Task Updates:`;

    if (checkInTasks.length === 0) {
      report += '\nNo tasks worked on today.';
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

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setIsProcessing(true);
    try {
      const subTasksToSave = newSubTasks
        .filter(st => st.title.trim()) // Only include subtasks with titles
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
        // Reset form
        setNewTaskTitle('');
        setNewTaskPriority('medium');
        setNewSubTasks([]);
        setShowAddTaskModal(false);
        // Refresh tasks
        await fetchTasks();
        // Re-open check-in modal
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

  const handleLogout = () => {
    setShowMenu(false);
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

  const formatCheckInTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).toLowerCase();
      }
      return timeString.toLowerCase();
    } catch {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {(user?.employeeName || user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>{user?.employeeName || user?.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              Alert.alert('Settings', 'Settings coming soon');
            }}
          >
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Text style={[styles.menuItemText, styles.menuItemLogout]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Divider Line */}
      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Today's Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Check In</Text>
              <Text style={styles.summaryValue}>
                {attendanceData.checkInTime ? formatCheckInTime(attendanceData.checkInTime) : '--:--'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Check Out</Text>
              <Text style={styles.summaryValue}>
                {attendanceData.checkOutTime ? formatCheckInTime(attendanceData.checkOutTime) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{attendanceData.totalHours.toFixed(2)} hrs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Break Time</Text>
              <Text style={styles.summaryValue}>{formatBreakTime(attendanceData.breakDuration || 0)}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Location</Text>
              <Text style={styles.summaryValue}>{attendanceData.workLocation || '--'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={[
                styles.summaryValue,
                attendanceData.isCheckedIn
                  ? (attendanceData.isOnBreak ? styles.statusBreak : styles.statusActive)
                  : styles.statusInactive
              ]}>
                {attendanceData.isCheckedIn
                  ? attendanceData.isOnBreak ? 'On Break' : 'Working'
                  : 'Not Checked In'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {!attendanceData.isCheckedIn ? (
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
              onPress={openCheckInModal}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>CHECK IN</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.breakButton, attendanceData.isOnBreak && styles.breakButtonActive, isProcessing && styles.buttonDisabled]}
                onPress={handleBreakToggle}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.breakButtonText}>
                    {attendanceData.isOnBreak ? 'END BREAK' : 'START BREAK'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkoutButton, isProcessing && styles.buttonDisabled]}
                onPress={handleCheckOut}
                disabled={isProcessing}
              >
                <Text style={styles.checkoutButtonText}>CHECK OUT</Text>
              </TouchableOpacity>
            </>
          )}
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
                console.log('Add Task button pressed, closing check-in modal first...');
                setShowCheckInModal(false);
                // Small delay to let the first modal close before opening the second
                setTimeout(() => {
                  console.log('Opening add task modal...');
                  setShowAddTaskModal(true);
                }, 100);
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

                  {/* Subtasks */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <View style={styles.subTasksContainer}>
                      {task.subTasks.map((subTask, subIndex) => (
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

          {/* Footer Buttons */}
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
        onShow={() => console.log('Add Task Modal is now visible')}
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
            {/* Task Title */}
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter task title..."
              placeholderTextColor="#6b7280"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            {/* Priority Selection */}
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

            {/* Subtasks */}
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

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setNewTaskTitle('');
                setNewTaskPriority('medium');
                setNewSubTasks([]);
                setShowAddTaskModal(false);
                // Re-open check-in modal
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
            <Text style={styles.modalTitle}>Copy Report to WhatsApp</Text>

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
      </ScrollView>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  menuButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 22,
    height: 2.5,
    backgroundColor: '#374151',
    marginVertical: 2,
    borderRadius: 1,
  },
  menuDropdown: {
    position: 'absolute',
    top: 95,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemLogout: {
    color: '#ef4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusActive: {
    color: '#22c55e',
  },
  statusInactive: {
    color: '#ef4444',
  },
  statusBreak: {
    color: '#f59e0b',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  timeText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  locationText: {
    color: '#3b82f6',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  timeCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  timeValue: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  breakButton: {
    backgroundColor: '#f59e0b',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  breakButtonActive: {
    backgroundColor: '#22c55e',
  },
  breakButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  checkoutButton: {
    backgroundColor: '#fee2e2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  checkoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Full Screen Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    borderTopColor: '#e5e7eb',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  cancelModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelModalButtonText: {
    color: '#374151',
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
    backgroundColor: '#eff6ff',
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
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTasksSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },

  // Task Card
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#1f2937',
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

  // Subtasks in task card
  subTasksContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subTaskItem: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  subTaskBullet: {
    color: '#6b7280',
    fontSize: 14,
    marginRight: 8,
  },
  subTaskContent: {
    flex: 1,
  },
  subTaskTitle: {
    color: '#374151',
    fontSize: 14,
  },
  subTaskNotes: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Add Task Form
  inputLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    color: '#1f2937',
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
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  priorityOptionActive: {
    borderColor: 'transparent',
  },
  priorityOptionText: {
    color: '#6b7280',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subTaskIndex: {
    color: '#6b7280',
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
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    color: '#1f2937',
    fontSize: 14,
  },
  subTaskNotesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    color: '#1f2937',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  locationOption: {
    backgroundColor: '#f9fafb',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  locationOptionText: {
    color: '#1f2937',
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
    color: '#6b7280',
    fontSize: 16,
  },

  // Report Modal
  reportModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reportPreview: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportText: {
    color: '#1f2937',
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
    color: '#6b7280',
    fontSize: 14,
  },
});
