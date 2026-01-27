import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { tasksService, Task, SubTask } from '../../src/services/tasks';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await tasksService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTasks();
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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
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
                  <Text style={styles.subtasksLabel}>Subtasks ({task.subTasks.filter(st => st.completed).length}/{task.subTasks.length})</Text>
                  {task.subTasks.map((subtask: SubTask) => (
                    <View key={subtask.id} style={styles.subtaskItem}>
                      <Text style={[styles.subtaskCheckbox, subtask.completed && styles.subtaskChecked]}>
                        {subtask.completed ? '✓' : '○'}
                      </Text>
                      <View style={styles.subtaskContent}>
                        <Text style={[styles.subtaskTitle, subtask.completed && styles.subtaskCompleted]}>
                          {subtask.title}
                        </Text>
                        {subtask.notes && (
                          <Text style={styles.subtaskNotes}>{subtask.notes}</Text>
                        )}
                      </View>
                    </View>
                  ))}
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
    backgroundColor: '#0f1824',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1824',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#1a2332',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#0f1824',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    color: '#9ca3af',
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
    color: '#9ca3af',
    fontSize: 16,
  },
  taskCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
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
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  taskDescription: {
    color: '#9ca3af',
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
    color: '#6b7280',
    fontSize: 12,
  },
  taskTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  subtasksContainer: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#0f1824',
    borderRadius: 10,
    padding: 12,
  },
  subtasksLabel: {
    color: '#9ca3af',
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
    borderBottomColor: '#1a2332',
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
    color: '#fff',
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
