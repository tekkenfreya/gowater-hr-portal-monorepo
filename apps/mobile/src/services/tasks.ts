import * as SecureStore from 'expo-secure-store';
import { authEvents } from './authEvents';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function checkUnauthorized(response: Response) {
  if (response.status === 401) {
    authEvents.emit('unauthorized');
  }
}

export interface SubTask {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancel' | 'archived' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number;
  category?: string;
  tags: string[];
  subTasks?: SubTask[];
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
      console.log('Tasks: fetching from', `${API_BASE_URL}/api/tasks`);
      const headers = await getAuthHeaders();
      console.log('Tasks: headers', JSON.stringify(headers));
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'GET',
        headers,
      });

      console.log('Tasks: response status', response.status);
      checkUnauthorized(response);
      if (!response.ok) {
        const text = await response.text();
        console.log('Tasks: error response', text.substring(0, 200));
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

      checkUnauthorized(response);
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

      checkUnauthorized(response);
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

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: Task['priority'];
    status?: Task['status'];
    subTasks?: SubTask[];
  }): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || '',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          subTasks: taskData.subTasks || [],
        }),
      });

      checkUnauthorized(response);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create task' };
      }

      return { success: true, task: data.task };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  async updateTask(id: string, taskData: {
    title?: string;
    description?: string;
    priority?: Task['priority'];
    status?: Task['status'];
    subTasks?: SubTask[];
  }): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id,
          ...taskData,
        }),
      });

      checkUnauthorized(response);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update task' };
      }

      return { success: true, task: data.task };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },
};
