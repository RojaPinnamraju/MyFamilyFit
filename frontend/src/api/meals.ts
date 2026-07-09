import apiClient from './client'
import type { MealEntry, MealType } from '../types'

export interface MealItemCreate {
  name: string
  quantity?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

export interface MealCreate {
  meal_type: MealType
  notes?: string
  logged_at?: string
  items?: MealItemCreate[]
}

export const mealsApi = {
  list: (params?: { skip?: number; limit?: number; date_filter?: string }) =>
    apiClient.get<MealEntry[]>('/meals/', { params }).then(r => r.data),

  get: (id: number) =>
    apiClient.get<MealEntry>(`/meals/${id}`).then(r => r.data),

  add: (data: MealCreate) =>
    apiClient.post<MealEntry>('/meals/', data).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/meals/${id}`),
}
