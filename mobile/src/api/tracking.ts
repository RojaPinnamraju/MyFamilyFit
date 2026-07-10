import { apiClient } from './client'
import { WorkoutLog, MealLog, WaterLog, WeightEntry } from '../types'

// ── Workouts ─────────────────────────────────────────────────────────────────
export const workoutApi = {
  list: () => apiClient.get<WorkoutLog[]>('/workouts').then(r => r.data),
  log: (data: Partial<WorkoutLog>) =>
    apiClient.post<WorkoutLog>('/workouts', data).then(r => r.data),
  todayCount: async () => {
    const logs = await apiClient.get<WorkoutLog[]>('/workouts').then(r => r.data)
    const today = new Date().toDateString()
    return logs.filter(w => new Date(w.logged_at).toDateString() === today).length
  },
}

// ── Meals ─────────────────────────────────────────────────────────────────────
export const mealApi = {
  list: () => apiClient.get<MealLog[]>('/meals').then(r => r.data),
  log: (data: Partial<MealLog>) =>
    apiClient.post<MealLog>('/meals', data).then(r => r.data),
  todayCalories: async () => {
    const logs = await apiClient.get<MealLog[]>('/meals').then(r => r.data)
    const today = new Date().toDateString()
    return logs
      .filter(m => new Date(m.logged_at).toDateString() === today)
      .reduce((sum, m) => sum + (m.calories ?? 0), 0)
  },
}

// ── Water ─────────────────────────────────────────────────────────────────────
export const waterApi = {
  list: () => apiClient.get<WaterLog[]>('/water').then(r => r.data),
  log: (amount_ml: number) =>
    apiClient.post<WaterLog>('/water', { amount_ml }).then(r => r.data),
  todayMl: async () => {
    const logs = await apiClient.get<WaterLog[]>('/water').then(r => r.data)
    const today = new Date().toDateString()
    return logs
      .filter(w => new Date(w.logged_at).toDateString() === today)
      .reduce((sum, w) => sum + w.amount_ml, 0)
  },
}

// ── Weight ────────────────────────────────────────────────────────────────────
export const weightApi = {
  list: () => apiClient.get<WeightEntry[]>('/weights').then(r => r.data),
  log: (weight_kg: number, notes?: string) =>
    apiClient.post<WeightEntry>('/weights', { weight_kg, notes }).then(r => r.data),
}
