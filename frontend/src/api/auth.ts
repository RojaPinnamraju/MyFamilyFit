import apiClient from './client'
import type { User } from '../types'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { name: string; email: string; password: string }
export interface AuthResponse { access_token: string; token_type: string; user: User }

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),
}
