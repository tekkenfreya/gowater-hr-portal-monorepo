import { useState, useCallback, useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { attendanceService } from '../../src/services/attendance';
import { tasksService, Task, SubTask } from '../../src/services/tasks';
import { photoCaptureService, LocationData } from '../../src/services/photoCapture';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Menu
  const [showMenu, setShowMenu] = useState(false);

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportType, setReportType] = useState<'start' | 'end'>('start');
  const [showPhotoSavedModal, setShowPhotoSavedModal] = useState(false);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isSharingPhoto, setIsSharingPhoto] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);

  // Photo capture state (check-in)
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<LocationData | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  // Photo capture state (check-out)
  const [showCheckOutPhotoModal, setShowCheckOutPhotoModal] = useState(false);
  const [checkOutPhotoUri, setCheckOutPhotoUri] = useState<string | null>(null);
  const [checkOutPhotoUrl, setCheckOutPhotoUrl] = useState<string | null>(null);
  const [checkOutLocation, setCheckOutLocation] = useState<LocationData | null>(null);
  const [isCapturingCheckOutPhoto, setIsCapturingCheckOutPhoto] = useState(false);

  // Photo capture state (break)
  const [showBreakPhotoModal, setShowBreakPhotoModal] = useState(false);
  const [breakPhotoUri, setBreakPhotoUri] = useState<string | null>(null);
  const [breakPhotoUrl, setBreakPhotoUrl] = useState<string | null>(null);
  const [breakLocation, setBreakLocation] = useState<LocationData | null>(null);
  const [isCapturingBreakPhoto, setIsCapturingBreakPhoto] = useState(false);
  const [breakAction, setBreakAction] = useState<'start' | 'end'>('start');

  // Tasks for check-out (with editable status)
  const [checkOutTasks, setCheckOutTasks] = useState<CheckInTask[]>([]);

  // Tasks for check-in and current tasks
  const [checkInTasks, setCheckInTasks] = useState<CheckInTask[]>([]);
  const [currentTasks, setCurrentTasks] = useState<CheckInTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newSubTasks, setNewSubTasks] = useState<NewSubTask[]>([]);

  const [attendanceStatus, setAttendanceStatus] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    checkInTimestamp?: number;
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

      // Use totalHours from API - preserve hours even after checkout
      if (status.totalHours !== undefined && status.totalHours > 0) {
        // Convert totalHours to seconds
        const totalSeconds = Math.floor(status.totalHours * 3600);
        setElapsedTime(totalSeconds);
      } else if (status.isCheckedIn && status.checkInTime) {
        // If checked in but no totalHours yet, calculate from check-in time
        const checkInDate = new Date(status.checkInTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - checkInDate.getTime()) / 1000);
        setElapsedTime(Math.max(0, elapsedSeconds));
      } else {
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (attendanceStatus.isCheckedIn && !attendanceStatus.isOnBreak) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [attendanceStatus.isCheckedIn, attendanceStatus.isOnBreak]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  };

  const formatCheckInTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      // Handle ISO date string or other formats
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).toLowerCase();
      }
      // If it's already formatted like "10:30 AM", just return lowercase
      return timeString.toLowerCase();
    } catch {
      return timeString;
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAttendanceStatus();
    fetchCurrentTasks();
  }, [fetchAttendanceStatus]);

  const fetchCurrentTasks = useCallback(async () => {
    try {
      const tasks = await tasksService.getTasks();
      // Include pending and in_progress tasks
      const activeTasks = tasks.filter(task =>
        task.status === 'pending' || task.status === 'in_progress'
      ).slice(0, 3).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subTasks: (task.subTasks || []).filter(st => !st.completed),
      }));
      setCurrentTasks(activeTasks);
    } catch (error) {
      console.error('Failed to fetch current tasks:', error);
    }
  }, []);

  const handleBreakToggle = () => {
    setBreakAction(attendanceStatus.isOnBreak ? 'end' : 'start');
    setBreakPhotoUri(null);
    setBreakPhotoUrl(null);
    setBreakLocation(null);
    setShowBreakPhotoModal(true);
  };

  const handleCaptureBreakPhoto = async () => {
    if (!user) return;

    setIsCapturingBreakPhoto(true);
    try {
      const result = await photoCaptureService.captureCheckInPhoto(user.id, 'break', {
        employeeName: user?.employeeName || user?.name,
        checkInTime: attendanceStatus.checkInTime,
        totalHours: attendanceStatus.totalHours,
        breakDuration: attendanceStatus.breakDuration,
        workLocation: attendanceStatus.workLocation,
        breakPhase: breakAction,
      });

      if (result.success) {
        setBreakPhotoUri(result.localUri || null);
        setBreakPhotoUrl(result.photoUrl || null);
        setBreakLocation(result.location || null);
      } else if (result.error === 'Photo capture was cancelled') {
        Alert.alert('Photo Required', 'Please take a photo to continue.');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture photo');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while capturing photo');
    } finally {
      setIsCapturingBreakPhoto(false);
    }
  };

  const handleConfirmBreak = async () => {
    setShowBreakPhotoModal(false);
    setIsProcessing(true);
    try {
      const result = breakAction === 'end'
        ? await attendanceService.endBreak(breakPhotoUrl || undefined)
        : await attendanceService.startBreak(breakPhotoUrl || undefined);

      if (result.success) {
        await fetchAttendanceStatus();

        // Save watermarked photo to gallery and show share modal
        if (breakPhotoUrl) {
          setSavedPhotoUrl(breakPhotoUrl);
          setIsSavingPhoto(true);
          setShowPhotoSavedModal(true);
          const saveResult = await photoCaptureService.saveToGallery(breakPhotoUrl);
          setIsSavingPhoto(false);
          if (!saveResult.success) {
            console.log('Failed to save to gallery:', saveResult.error);
          }
        }

        // Reset break photo state
        setBreakPhotoUri(null);
        setBreakPhotoUrl(null);
        setBreakLocation(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to toggle break');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
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

  // Initial load
  useEffect(() => {
    fetchAttendanceStatus();
    fetchCurrentTasks();
  }, []);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refetch if not initial load
      if (!isLoading) {
        fetchAttendanceStatus();
        fetchCurrentTasks();
      }
    }, [fetchAttendanceStatus, fetchCurrentTasks, isLoading])
  );

const openCheckInModal = () => {
    fetchTasks();
    setShowCheckInModal(true);
  };

  const handleProceedToPhoto = () => {
    setShowCheckInModal(false);
    // Reset photo state
    setCapturedPhotoUri(null);
    setCapturedPhotoUrl(null);
    setCapturedLocation(null);
    setShowPhotoModal(true);
  };

  const handleCapturePhoto = async () => {
    if (!user) return;

    setIsCapturingPhoto(true);
    try {
      const result = await photoCaptureService.captureCheckInPhoto(user.id, 'checkin', {
        employeeName: user?.employeeName || user?.name,
      });

      if (result.success) {
        setCapturedPhotoUri(result.localUri || null);
        setCapturedPhotoUrl(result.photoUrl || null);
        setCapturedLocation(result.location || null);
        // Proceed to location selection
        setShowPhotoModal(false);
        setShowLocationModal(true);
      } else if (result.error === 'Photo capture was cancelled') {
        // User cancelled, stay on photo modal
        Alert.alert('Photo Required', 'Please take a photo to continue with check-in.');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture photo');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while capturing photo');
    } finally {
      setIsCapturingPhoto(false);
    }
  };


  const handleCheckIn = async (location: WorkLocation) => {
    setShowLocationModal(false);
    setIsProcessing(true);

    try {
      const result = await attendanceService.checkIn(location, capturedPhotoUrl || undefined);
      if (result.success) {
        await fetchAttendanceStatus();
        const report = generateStartReport(location, capturedPhotoUrl, capturedLocation);
        setReportContent(report);
        setReportType('start');
        setShowReportModal(true);
        // Reset photo state after successful check-in
        setCapturedPhotoUri(null);
        setCapturedPhotoUrl(null);
        setCapturedLocation(null);
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

  const generateStartReport = (location: WorkLocation, photoUrl?: string | null, locationData?: LocationData | null) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GoWater Start of Day Report`;

    if (photoUrl) {
      report += `\n\nCheck-in Photo: ${photoUrl}`;
      if (locationData?.address) {
        report += `\nLocation: ${locationData.address}`;
      }
    }

    report += `

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

  const handleSharePhoto = async () => {
    if (!savedPhotoUrl) return;
    setIsSharingPhoto(true);
    try {
      const result = await photoCaptureService.sharePhoto(savedPhotoUrl);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to share photo');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while sharing');
    } finally {
      setIsSharingPhoto(false);
    }
  };

  // Check-out flow
  const openCheckOutModal = async () => {
    setIsLoadingTasks(true);
    setShowCheckOutModal(true);
    // Reset checkout photo state
    setCheckOutPhotoUri(null);
    setCheckOutPhotoUrl(null);
    setCheckOutLocation(null);
    try {
      const tasks = await tasksService.getTasks();
      const incompleteTasks = tasks.filter(task =>
        task.status !== 'archived' &&
        task.status !== 'completed' &&
        (task.status === 'pending' || task.status === 'in_progress' || task.status === 'cancel')
      ).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subTasks: (task.subTasks || []).filter(st => !st.completed).map(st => ({
          ...st,
          status: st.completed ? 'completed' : 'pending',
        })),
      })).filter(task => {
        // Hide tasks where all subtasks were already completed
        if (task.subTasks && task.subTasks.length === 0) {
          return false;
        }
        return true;
      });
      setCheckOutTasks(incompleteTasks as CheckInTask[]);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleProceedToCheckOutPhoto = () => {
    setShowCheckOutModal(false);
    setShowCheckOutPhotoModal(true);
  };

  const handleCaptureCheckOutPhoto = async () => {
    if (!user) return;

    setIsCapturingCheckOutPhoto(true);
    try {
      const result = await photoCaptureService.captureCheckInPhoto(user.id, 'checkout', {
        employeeName: user?.employeeName || user?.name,
        checkInTime: attendanceStatus.checkInTime,
        totalHours: attendanceStatus.totalHours,
        breakDuration: attendanceStatus.breakDuration,
        workLocation: attendanceStatus.workLocation,
      });

      if (result.success) {
        setCheckOutPhotoUri(result.localUri || null);
        setCheckOutPhotoUrl(result.photoUrl || null);
        setCheckOutLocation(result.location || null);
      } else if (result.error === 'Photo capture was cancelled') {
        Alert.alert('Photo Required', 'Please take a photo to complete check-out.');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture photo');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while capturing photo');
    } finally {
      setIsCapturingCheckOutPhoto(false);
    }
  };

  const handleConfirmCheckOutWithPhoto = async () => {
    setShowCheckOutPhotoModal(false);
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
      const report = generateEODReport(checkOutPhotoUrl, checkOutLocation);
      await Clipboard.setStringAsync(report);

      // Call checkout API with photo URL
      const result = await attendanceService.checkOut(checkOutPhotoUrl || undefined);
      if (result.success) {
        await fetchAttendanceStatus();
        // Reset checkout photo state
        setCheckOutPhotoUri(null);
        setCheckOutPhotoUrl(null);
        setCheckOutLocation(null);
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

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setCheckOutTasks(prev =>
      prev.map(task => {
        if (task.id !== taskId) return task;
        // When marking task as completed, auto-check all subtasks
        if (newStatus === 'completed' && task.subTasks.length > 0) {
          return {
            ...task,
            status: newStatus,
            subTasks: task.subTasks.map(st => ({ ...st, completed: true })),
          };
        }
        // When changing away from completed, uncheck all subtasks
        if (task.status === 'completed' && newStatus !== 'completed' && task.subTasks.length > 0) {
          return {
            ...task,
            status: newStatus,
            subTasks: task.subTasks.map(st => ({ ...st, completed: false })),
          };
        }
        return { ...task, status: newStatus };
      })
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

  const generateEODReport = (photoUrl?: string | null, locationData?: LocationData | null) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GoWater End of Day Report`;

    if (photoUrl) {
      report += `\n\nCheck-out Photo: ${photoUrl}`;
      if (locationData?.address) {
        report += `\nLocation: ${locationData.address}`;
      }
    }

    // Format check-in time from ISO string to readable time
    let loginTimeFormatted = 'N/A';
    if (attendanceStatus.checkInTime) {
      try {
        const ciDate = new Date(attendanceStatus.checkInTime);
        if (!isNaN(ciDate.getTime())) {
          loginTimeFormatted = ciDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
      } catch {
        loginTimeFormatted = 'N/A';
      }
    }

    // Calculate hours from check-in to now if totalHours is 0
    let hoursWorked = attendanceStatus.totalHours;
    if (hoursWorked <= 0 && attendanceStatus.checkInTime) {
      try {
        const ciDate = new Date(attendanceStatus.checkInTime);
        if (!isNaN(ciDate.getTime())) {
          hoursWorked = (now.getTime() - ciDate.getTime()) / (1000 * 60 * 60);
        }
      } catch {
        hoursWorked = 0;
      }
    }

    report += `

Date: ${date}
Employee: ${user?.employeeName || user?.name || 'N/A'}
Position: ${user?.role || 'N/A'}
Work Arrangement: ${attendanceStatus.workLocation || 'N/A'}
Login Time: ${loginTimeFormatted}
Logout Time: ${time}
Hours Worked: ${hoursWorked.toFixed(2)} hours
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

  const timer = formatTimer(elapsedTime);

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
            <Text style={styles.headerTitle}>Home</Text>
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
        {/* Time Card */}
        <View style={styles.timeCard}>
          <View style={styles.timerRow}>
            <View style={styles.timerDisplay}>
              <View style={styles.timerBlock}>
                <Text style={styles.timerNumber}>{timer.hours}</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerBlock}>
                <Text style={styles.timerNumber}>{timer.minutes}</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerBlock}>
                <Text style={styles.timerNumber}>{timer.seconds}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {!attendanceStatus.isCheckedIn ? (
                <TouchableOpacity
                  style={styles.checkInBtn}
                  onPress={openCheckInModal}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.checkInBtnText}>Check-In</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.breakBtn, attendanceStatus.isOnBreak && styles.breakBtnActive]}
                    onPress={handleBreakToggle}
                    disabled={isProcessing}
                  >
                    <Text style={styles.breakBtnText}>
                      {attendanceStatus.isOnBreak ? 'End' : 'Break'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.checkOutBtn}
                    onPress={openCheckOutModal}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.checkOutBtnText}>Check-Out</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <Text style={[
            styles.checkInStatus,
            attendanceStatus.isCheckedIn ? styles.checkInStatusActive : styles.checkInStatusInactive
          ]}>
            {attendanceStatus.isCheckedIn
              ? attendanceStatus.isOnBreak
                ? 'On Break'
                : `Checked in at ${formatCheckInTime(attendanceStatus.checkInTime)}`
              : 'Yet to check-in'}
          </Text>
        </View>

      {/* Current Tasks */}
      <View style={styles.currentTasksCard}>
        <View style={styles.currentTasksHeader}>
          <View style={styles.currentTasksIconContainer}>
            <Text style={styles.currentTasksIcon}>T</Text>
          </View>
          <View>
            <Text style={styles.currentTasksTitle}>Current Tasks</Text>
            <Text style={styles.currentTasksSubtitle}>
              {currentTasks.length} pending task{currentTasks.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {currentTasks.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Text style={styles.noTasksText}>No pending tasks</Text>
          </View>
        ) : (
          currentTasks.map((task) => (
            <View key={task.id} style={styles.currentTaskItem}>
              <View style={[styles.taskPriorityDot, { backgroundColor: getPriorityBgColor(task.priority) }]} />
              <View style={styles.currentTaskInfo}>
                <Text style={styles.currentTaskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={[styles.currentTaskStatus, { color: getStatusTextColor(task.status) }]}>
                  {task.status.replace('_', ' ')}
                </Text>
                {task.subTasks && task.subTasks.length > 0 && (
                  <View style={styles.currentTaskSubtasks}>
                    {task.subTasks.slice(0, 2).map((subTask) => (
                      <View key={subTask.id} style={styles.currentSubtaskItem}>
                        <Text style={styles.currentSubtaskBullet}>-</Text>
                        <Text style={styles.currentSubtaskTitle} numberOfLines={1}>{subTask.title}</Text>
                      </View>
                    ))}
                    {task.subTasks.length > 2 && (
                      <Text style={styles.currentSubtaskMore}>+{task.subTasks.length - 2} more</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={() => router.push('/(auth)/tasks')}
        >
          <Text style={styles.viewMoreButtonText}>View More</Text>
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
              onPress={handleProceedToPhoto}
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

      {/* Photo Capture Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalContent}>
            <Text style={styles.modalTitle}>Check-in Photo</Text>
            <Text style={styles.photoModalSubtitle}>
              Take a photo to verify your check-in location
            </Text>

            {capturedPhotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={{ uri: capturedPhotoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                {capturedLocation?.address && (
                  <Text style={styles.photoLocationText} numberOfLines={2}>
                    {capturedLocation.address}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleCapturePhoto}
                  disabled={isCapturingPhoto}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoCaptureContainer}>
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
                <TouchableOpacity
                  style={[styles.captureButton, isCapturingPhoto && styles.buttonDisabled]}
                  onPress={handleCapturePhoto}
                  disabled={isCapturingPhoto}
                >
                  {isCapturingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.captureButtonText}>Take Photo</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {capturedPhotoUri && (
              <View style={styles.photoModalFooter}>
                <TouchableOpacity
                  style={styles.cancelPhotoButton}
                  onPress={() => {
                    setCapturedPhotoUri(null);
                    setCapturedPhotoUrl(null);
                    setCapturedLocation(null);
                    setShowPhotoModal(false);
                  }}
                >
                  <Text style={styles.cancelPhotoButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => {
                    setShowPhotoModal(false);
                    setShowLocationModal(true);
                  }}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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

      {/* Report Modal (check-in / check-out) */}
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

      {/* Photo Saved / Share Modal (break only) */}
      <Modal
        visible={showPhotoSavedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoSavedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoSavedModalContent}>
            <View style={styles.photoSavedIconContainer}>
              <Text style={styles.photoSavedIcon}>
                {isSavingPhoto ? '' : ''}
              </Text>
            </View>
            <Text style={styles.photoSavedTitle}>
              {isSavingPhoto ? 'Saving Photo...' : 'Photo Saved!'}
            </Text>
            <Text style={styles.photoSavedSubtitle}>
              {isSavingPhoto
                ? 'Saving watermarked photo to your gallery'
                : 'Watermarked photo has been saved to your gallery'}
            </Text>

            {isSavingPhoto && (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 16 }} />
            )}

            {!isSavingPhoto && (
              <>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleSharePhoto}
                  disabled={isSharingPhoto}
                >
                  {isSharingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.shareButtonText}>Share Photo</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    setShowPhotoSavedModal(false);
                    setSavedPhotoUrl(null);
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
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
              style={styles.checkOutConfirmButton}
              onPress={handleProceedToCheckOutPhoto}
            >
              <Text style={styles.confirmButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check Out Photo Modal */}
      <Modal
        visible={showCheckOutPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckOutPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalContent}>
            <Text style={styles.modalTitle}>Check-out Photo</Text>
            <Text style={styles.photoModalSubtitle}>
              Take a photo to verify your check-out location
            </Text>

            {checkOutPhotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={{ uri: checkOutPhotoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                {checkOutLocation?.address && (
                  <Text style={styles.photoLocationText} numberOfLines={2}>
                    {checkOutLocation.address}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleCaptureCheckOutPhoto}
                  disabled={isCapturingCheckOutPhoto}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoCaptureContainer}>
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
                <TouchableOpacity
                  style={[styles.captureButton, styles.checkOutCaptureButton, isCapturingCheckOutPhoto && styles.buttonDisabled]}
                  onPress={handleCaptureCheckOutPhoto}
                  disabled={isCapturingCheckOutPhoto}
                >
                  {isCapturingCheckOutPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.captureButtonText}>Take Photo</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {checkOutPhotoUri && (
              <View style={styles.photoModalFooter}>
                <TouchableOpacity
                  style={styles.cancelPhotoButton}
                  onPress={() => {
                    setCheckOutPhotoUri(null);
                    setCheckOutPhotoUrl(null);
                    setCheckOutLocation(null);
                    setShowCheckOutPhotoModal(false);
                  }}
                >
                  <Text style={styles.cancelPhotoButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.continueButton, styles.checkOutContinueButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleConfirmCheckOutWithPhoto}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.continueButtonText}>Confirm Logout</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Break Photo Modal */}
      <Modal
        visible={showBreakPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBreakPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalContent}>
            <View style={styles.breakTitleContainer}>
              <Text style={styles.breakTitleText}>
                {breakAction === 'start' ? 'BREAK' : 'END BREAK'}
              </Text>
            </View>

            {breakPhotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={{ uri: breakPhotoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                {breakLocation?.address && (
                  <Text style={styles.photoLocationText} numberOfLines={2}>
                    {breakLocation.address}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleCaptureBreakPhoto}
                  disabled={isCapturingBreakPhoto}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoCaptureContainer}>
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
                <TouchableOpacity
                  style={[styles.captureButton, styles.breakCaptureButton, isCapturingBreakPhoto && styles.buttonDisabled]}
                  onPress={handleCaptureBreakPhoto}
                  disabled={isCapturingBreakPhoto}
                >
                  {isCapturingBreakPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.captureButtonText}>Take Photo</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {breakPhotoUri && (
              <View style={styles.photoModalFooter}>
                <TouchableOpacity
                  style={styles.cancelPhotoButton}
                  onPress={() => {
                    setBreakPhotoUri(null);
                    setBreakPhotoUrl(null);
                    setBreakLocation(null);
                    setShowBreakPhotoModal(false);
                  }}
                >
                  <Text style={styles.cancelPhotoButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.continueButton, styles.breakContinueButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleConfirmBreak}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.continueButtonText}>
                      {breakAction === 'start' ? 'Start Break' : 'End Break'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!breakPhotoUri && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBreakPhotoModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Time Card
  timeCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBlock: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 38,
    alignItems: 'center',
  },
  timerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    fontVariant: ['tabular-nums'],
  },
  timerSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  breakBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  breakBtnActive: {
    backgroundColor: '#22c55e',
  },
  breakBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkOutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkInStatus: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  checkInStatusActive: {
    color: '#22c55e',
  },
  checkInStatusInactive: {
    color: '#f59e0b',
  },

  // Current Tasks Card
  currentTasksCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentTasksIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentTasksIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  currentTasksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  currentTasksSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  noTasksContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noTasksText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  currentTaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskPriorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    marginTop: 5,
  },
  currentTaskInfo: {
    flex: 1,
  },
  currentTaskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  currentTaskStatus: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  currentTaskSubtasks: {
    marginTop: 6,
    paddingLeft: 4,
  },
  currentSubtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentSubtaskBullet: {
    color: '#9ca3af',
    fontSize: 12,
    marginRight: 6,
  },
  currentSubtaskTitle: {
    color: '#6b7280',
    fontSize: 12,
    flex: 1,
  },
  currentSubtaskMore: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  viewMoreButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
  },
  viewMoreButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
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

  // Subtasks
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

  // Photo Saved / Share Modal
  photoSavedModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  photoSavedIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoSavedIcon: {
    fontSize: 36,
  },
  photoSavedTitle: {
    color: '#1f2937',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  photoSavedSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },

  // Photo Capture Modal Styles
  photoModalContent: {
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
  photoModalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -16,
    marginBottom: 20,
  },
  photoCaptureContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cameraPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  cameraIcon: {
    fontSize: 48,
  },
  captureButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoLocationText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  retakeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  retakeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  photoModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  skipPhotoButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipPhotoButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  continueButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelPhotoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  cancelPhotoButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  checkOutCaptureButton: {
    backgroundColor: '#ef4444',
  },
  checkOutContinueButton: {
    backgroundColor: '#ef4444',
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
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hoursWorkedLabel: {
    color: '#3b82f6',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hoursWorkedValue: {
    color: '#1d4ed8',
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
    color: '#3b82f6',
    fontSize: 12,
  },
  checkOutSectionTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkOutTaskCard: {
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
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  statusOptionText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
  },
  checkOutSubTasks: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
    borderColor: '#d1d5db',
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
    color: '#374151',
    fontSize: 14,
    flex: 1,
  },
  checkOutSubTaskCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },

  // Break Photo Modal
  breakTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
  },
  breakTitleText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  breakCaptureButton: {
    backgroundColor: '#f59e0b',
  },
  breakContinueButton: {
    backgroundColor: '#f59e0b',
  },
});
