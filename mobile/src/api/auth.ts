import { apiClient, API_BASE } from './client'
import { User } from '../types'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
  email: string; password: string; name: string
  age?: number; height_cm?: number
  current_weight_kg?: number; target_weight_kg?: number
  goal_type?: string
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<{ access_token: string }>('/auth/login', data).then(r => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<{ access_token: string }>('/auth/register', data).then(r => r.data),

  getMe: (token: string) =>
    apiClient.get<User>('/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.data),

  googleAuthUrl: `${API_BASE}/auth/google`,
}
