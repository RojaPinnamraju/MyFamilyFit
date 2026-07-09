import apiClient from './client'
import type { WeightEntry } from '../types'

export interface WeightCreate { weight_kg: number; notes?: string; logged_at?: string }
export interface WeightUpdate { weight_kg?: number; notes?: string; logged_at?: string }

export const weightsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<WeightEntry[]>('/weights/', { params }).then(r => r.data),

  add: (data: WeightCreate) =>
    apiClient.post<WeightEntry>('/weights/', data).then(r => r.data),

  update: (id: number, data: WeightUpdate) =>
    apiClient.patch<WeightEntry>(`/weights/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/weights/${id}`),
}
