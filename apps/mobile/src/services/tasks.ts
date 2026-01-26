import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const tasksService = {
  async getTasks(): Promise<Task[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  async getTask(id: string): Promise<Task | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update task' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },
};
