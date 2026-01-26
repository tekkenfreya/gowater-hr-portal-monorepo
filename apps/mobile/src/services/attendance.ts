import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type WorkLocation = 'WFH' | 'Onsite' | 'Field';

interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  isOnBreak: boolean;
  breakStartTime?: string;
  workLocation?: WorkLocation;
  totalHours: number;
}

interface ApiResponse {
  success: boolean;
  error?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const attendanceService = {
  async getTodayStatus(): Promise<AttendanceStatus> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/attendance/today`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance status');
      }

      const data = await response.json();

      return {
        isCheckedIn: !!data.checkInTime,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        isOnBreak: !!data.breakStartTime && !data.breakEndTime,
        breakStartTime: data.breakStartTime,
        workLocation: data.workLocation,
        totalHours: data.totalHours || 0,
      };
    } catch (error) {
      console.error('Error fetching attendance status:', error);
      return {
        isCheckedIn: false,
        isOnBreak: false,
        totalHours: 0,
      };
    }
  },

  async checkIn(workLocation: WorkLocation): Promise<ApiResponse> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ workLocation }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to check in' };
      }

      return { success: true };
    } catch (error) {
      console.error('Check-in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  async checkOut(): Promise<ApiResponse> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to check out' };
      }

      return { success: true };
    } catch (error) {
      console.error('Check-out error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  async startBreak(): Promise<ApiResponse> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/attendance/break/start`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to start break' };
      }

      return { success: true };
    } catch (error) {
      console.error('Start break error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  async endBreak(): Promise<ApiResponse> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/attendance/break/end`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to end break' };
      }

      return { success: true };
    } catch (error) {
      console.error('End break error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },
};
