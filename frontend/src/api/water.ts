import apiClient from './client'
import type { WaterEntry, WaterSummary } from '../types'

export const waterApi = {
  getToday: () =>
    apiClient.get<WaterSummary>('/water/today').then(r => r.data),

  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<WaterEntry[]>('/water/', { params }).then(r => r.data),

  add: (amount_ml: number) =>
    apiClient.post<WaterEntry>('/water/', { amount_ml }).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/water/${id}`),
}
