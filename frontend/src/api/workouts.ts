import apiClient from './client'
import type { WorkoutEntry, ExerciseCategory } from '../types'

export interface ExerciseCreate {
  name: string
  category?: ExerciseCategory
  sets?: number
  reps?: number
  weight_kg?: number
  duration_seconds?: number
  notes?: string
}

export interface WorkoutCreate {
  name: string
  notes?: string
  duration_minutes?: number
  logged_at?: string
  exercises?: ExerciseCreate[]
}

export const workoutsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<WorkoutEntry[]>('/workouts/', { params }).then(r => r.data),

  get: (id: number) =>
    apiClient.get<WorkoutEntry>(`/workouts/${id}`).then(r => r.data),

  add: (data: WorkoutCreate) =>
    apiClient.post<WorkoutEntry>('/workouts/', data).then(r => r.data),

  update: (id: number, data: Partial<WorkoutCreate>) =>
    apiClient.patch<WorkoutEntry>(`/workouts/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/workouts/${id}`),
}
