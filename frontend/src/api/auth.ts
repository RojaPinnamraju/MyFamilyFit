import apiClient from './client'
import type { User } from '../types'

export interface LoginPayload    { email: string; password: string }
export interface RegisterPayload { name: string; email: string; password: string }
export interface AuthResponse    { access_token: string; token_type: string; user: User }

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  /** Fetch the current user's profile using an explicit token (used after OAuth callback). */
  getMe: (token: string) =>
    apiClient
      .get<User>('/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.data),

  /**
   * Redirects the browser to the backend Google OAuth initiation URL.
   * This is a full-page navigation, not an API call — the browser follows
   * the redirect chain entirely: FamilyFit backend → Google → backend callback → frontend.
   */
  startGoogleSignIn: () => {
    window.location.href = `${API_BASE}/auth/google`
  },
}
