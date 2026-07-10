import apiClient from './client'
import type { Medication, MedicationLog, TodayMedItem, MedLogStatus } from '../types'

export interface MedicationCreate {
  name: string
  dosage?: string
  frequency: string
  reminder_times: string[]
  food_timing: string
  notes?: string
  start_date?: string
  end_date?: string
}

export const medicationsApi = {
  list: (activeOnly = true) =>
    apiClient.get<Medication[]>('/medications', { params: { active_only: activeOnly } }).then(r => r.data),

  create: (data: MedicationCreate) =>
    apiClient.post<Medication>('/medications', data).then(r => r.data),

  update: (id: number, data: Partial<MedicationCreate> & { is_active?: boolean }) =>
    apiClient.patch<Medication>(`/medications/${id}`, data).then(r => r.data),

  remove: (id: number) =>
    apiClient.delete(`/medications/${id}`),

  getToday: () =>
    apiClient.get<TodayMedItem[]>('/medications/today').then(r => r.data),

  log: (medId: number, status: MedLogStatus, reminderTime: string, logDate: string, notes?: string) =>
    apiClient.post<MedicationLog>(`/medications/${medId}/logs`, {
      log_date: logDate,
      reminder_time: reminderTime,
      status,
      notes,
    }).then(r => r.data),

  getLogs: (medId: number, days = 30) =>
    apiClient.get<MedicationLog[]>(`/medications/${medId}/logs`, { params: { days } }).then(r => r.data),

  testReminder: (medId: number) =>
    apiClient.post(`/medications/${medId}/test-reminder`).then(r => r.data),
}
