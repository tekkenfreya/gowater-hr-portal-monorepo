import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { tasksService, Task, SubTask } from '../../src/services/tasks';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TasksScreen() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const fetchTasks = useCallback(async () => {
    try {
      const data = await tasksService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, []);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        fetchTasks();
      }
    }, [fetchTasks, isLoading])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTasks();
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

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === 'all') return true;
      return task.status === filter;
    })
    .sort((a, b) => {
      // Sort by createdAt descending (latest first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#22c55e';
      default:
        return '#9ca3af';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
            <Text style={styles.headerTitle}>Tasks</Text>
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

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks found</Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                  <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: getStatusColor(task.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.taskTitle}>{task.title}</Text>

              {task.description && (
                <Text style={styles.taskDescription}>
                  {task.description}
                </Text>
              )}

              {/* Subtasks */}
              {task.subTasks && task.subTasks.length > 0 && (
                <View style={styles.subtasksContainer}>
                  <Text style={styles.subtasksLabel}>
                    Subtasks ({task.status === 'completed' ? task.subTasks.length : task.subTasks.filter(st => st.completed).length}/{task.subTasks.length})
                  </Text>
                  {task.subTasks.map((subtask: SubTask) => {
                    // If parent task is completed, treat all subtasks as completed
                    const isCompleted = task.status === 'completed' || subtask.completed;
                    return (
                      <View key={subtask.id} style={styles.subtaskItem}>
                        <Text style={[styles.subtaskCheckbox, isCompleted && styles.subtaskChecked]}>
                          {isCompleted ? '✓' : '○'}
                        </Text>
                        <View style={styles.subtaskContent}>
                          <Text style={[styles.subtaskTitle, isCompleted && styles.subtaskCompleted]}>
                            {subtask.title}
                          </Text>
                          {subtask.notes && (
                            <Text style={styles.subtaskNotes}>{subtask.notes}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.taskFooter}>
                <View style={styles.taskFooterLeft}>
                  {task.category && (
                    <Text style={styles.taskCategory}>{task.category}</Text>
                  )}
                  <Text style={styles.taskDate}>{formatDate(task.createdAt)}</Text>
                </View>
                {task.timeSpent > 0 && (
                  <Text style={styles.taskTime}>
                    {Math.floor(task.timeSpent / 3600)}h {Math.floor((task.timeSpent % 3600) / 60)}m
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
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

  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  tasksList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTitle: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  taskDescription: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCategory: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  taskTime: {
    color: '#6b7280',
    fontSize: 12,
  },
  subtasksContainer: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subtasksLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subtaskCheckbox: {
    color: '#9ca3af',
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  subtaskChecked: {
    color: '#22c55e',
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '500',
  },
  subtaskCompleted: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  subtaskNotes: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
