import { apiClient } from './client'
import { Family, FamilyMember } from '../types'

export const familyApi = {
  getMyFamily: () =>
    apiClient.get<Family>('/families/me').then(r => r.data),

  getMembers: (familyId: number) =>
    apiClient.get<FamilyMember[]>(`/families/${familyId}/members`).then(r => r.data),

  createFamily: (name: string) =>
    apiClient.post<Family>('/families', { name }).then(r => r.data),
}
