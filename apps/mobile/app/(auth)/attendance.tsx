import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { attendanceService } from '../../src/services/attendance';
import { useAuth } from '../../src/contexts/AuthContext';

type WorkLocation = 'WFH' | 'Onsite' | 'Field';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [attendanceData, setAttendanceData] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    checkOutTime?: string;
    isOnBreak: boolean;
    breakStartTime?: string;
    workLocation?: WorkLocation;
    totalHours: number;
  }>({
    isCheckedIn: false,
    isOnBreak: false,
    totalHours: 0,
  });

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const data = await attendanceService.getTodayStatus();
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (location: WorkLocation) => {
    setShowLocationModal(false);
    setIsProcessing(true);
    try {
      const result = await attendanceService.checkIn(location);
      if (result.success) {
        await fetchAttendanceData();
        // Generate and show report
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
                // Generate EOD report
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

  const generateStartReport = (location: WorkLocation) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `*START OF DAY REPORT*

Employee: ${user?.employeeName || user?.name}
Employee ID: ${user?.employeeId}
Date: ${date}
Time In: ${time}
Work Location: ${location}

---
GoWater Attendance System`;
  };

  const generateEODReport = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `*END OF DAY REPORT*

Employee: ${user?.employeeName || user?.name}
Employee ID: ${user?.employeeId}
Date: ${date}
Time Out: ${time}
Work Location: ${attendanceData.workLocation || 'N/A'}
Total Hours: ${attendanceData.totalHours.toFixed(2)}

---
GoWater Attendance System`;
  };

  const copyReportToClipboard = async () => {
    await Clipboard.setStringAsync(reportContent);
    Alert.alert('Copied!', 'Report copied to clipboard. Paste it in WhatsApp.');
    setShowReportModal(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current Status</Text>
        <Text style={[
          styles.statusValue,
          attendanceData.isCheckedIn ? styles.statusActive : styles.statusInactive
        ]}>
          {attendanceData.isCheckedIn
            ? attendanceData.isOnBreak
              ? 'On Break'
              : 'Working'
            : 'Not Checked In'}
        </Text>
        {attendanceData.checkInTime && (
          <Text style={styles.timeText}>Checked in at {attendanceData.checkInTime}</Text>
        )}
        {attendanceData.workLocation && (
          <Text style={styles.locationText}>{attendanceData.workLocation}</Text>
        )}
      </View>

      {/* Time Info */}
      {attendanceData.isCheckedIn && (
        <View style={styles.timeCard}>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Total Hours</Text>
            <Text style={styles.timeValue}>{attendanceData.totalHours.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {!attendanceData.isCheckedIn ? (
          <TouchableOpacity
            style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
            onPress={() => setShowLocationModal(true)}
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
                <Text style={styles.locationOptionText}>{location}</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Copy Report to WhatsApp</Text>

            <View style={styles.reportPreview}>
              <Text style={styles.reportText}>{reportContent}</Text>
            </View>

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
  statusCard: {
    backgroundColor: '#1a2332',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusActive: {
    color: '#22c55e',
  },
  statusInactive: {
    color: '#ef4444',
  },
  timeText: {
    color: '#9ca3af',
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
    backgroundColor: '#1a2332',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  timeValue: {
    color: '#fff',
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
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
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
  reportPreview: {
    backgroundColor: '#0f1824',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  reportText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
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
});
