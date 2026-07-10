import apiClient from './client'
import type { User, Dashboard } from '../types'

export interface ProfileUpdate {
  name?: string
  age?: number
  height_cm?: number
  gender?: string
  current_weight_kg?: number
  target_weight_kg?: number
  goal_type?: string
  activity_level?: string
  daily_calorie_goal?: number
  daily_water_goal_ml?: number
  avatar_color?: string
}

export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me').then(r => r.data),
  updateProfile: (data: ProfileUpdate) =>
    apiClient.patch<User>('/users/me', data).then(r => r.data),
  getDashboard: () => apiClient.get<Dashboard>('/users/me/dashboard').then(r => r.data),
}
