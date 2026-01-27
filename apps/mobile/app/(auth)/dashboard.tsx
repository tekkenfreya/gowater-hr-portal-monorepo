import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { router } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { attendanceService } from '../../src/services/attendance';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    isOnBreak: boolean;
  }>({
    isCheckedIn: false,
    isOnBreak: false,
  });

  const fetchAttendanceStatus = useCallback(async () => {
    try {
      const status = await attendanceService.getTodayStatus();
      setAttendanceStatus(status);
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    }
  }, []);

  // Refresh data every time the screen comes into focus
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

  return (
    <ScrollView style={styles.container}>
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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(auth)/attendance')}
        >
          <Text style={styles.actionButtonText}>
            {attendanceStatus.isCheckedIn ? 'View Attendance' : 'Check In'}
          </Text>
        </TouchableOpacity>

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
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 24,
  },
  logoutButtonText: {
    color: '#ef4444',
  },
});
