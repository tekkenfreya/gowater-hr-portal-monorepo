export interface User {
  id: number;
  email: string;
  name: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager' | 'intern';
  position?: string;
  department?: string;
  employeeName?: string;
  avatar?: string;
  force_password_reset?: boolean;
  last_password_change?: string;
  password_expires_at?: string;
  password_expiry_days?: number;
  permissions?: UserPermission[];
}

export interface Permission {
  id: number;
  permission_key: string;
  display_name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

export interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  permission_key: string;
  display_name: string;
  category?: string;
  granted_at: string;
  granted_by?: number;
}

export interface LoginCredentials {
  username: string; // Can be email or employee_id
  password: string;
}


export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}