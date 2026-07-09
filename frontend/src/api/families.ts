import apiClient from './client'
import type { Family, FamilyActivity } from '../types'

// ── Invitation types ──────────────────────────────────────────────────────────

export interface InvitationCreate {
  email?:   string
  message?: string
}

export interface InvitationResponse {
  id:          number
  family_id:   number
  family_name: string
  invited_by:  string
  email?:      string
  token:       string
  status:      'pending' | 'accepted' | 'revoked'
  message?:    string
  invite_url:  string
  expires_at:  string
  created_at:  string
  email_sent:  boolean
}

export interface InvitationPreview {
  family_name: string
  invited_by:  string
  message?:    string
  expires_at:  string
  valid:       boolean
  email?:      string   // pre-fill the email field on the registration form
}

export interface InviteAcceptPayload {
  name:               string
  email:              string
  password:           string
  age?:               number
  height_cm?:         number
  current_weight_kg?: number
  target_weight_kg?:  number
  goal_type?:         'lose_weight' | 'gain_muscle' | 'maintain'
}

// ── API ───────────────────────────────────────────────────────────────────────

export const familiesApi = {
  // ── Family CRUD ─────────────────────────────────────────────────────────────
  create: (name: string) =>
    apiClient.post<Family>('/families/', { name }).then(r => r.data),

  join: (invite_code: string) =>
    apiClient.post<Family>('/families/join', { invite_code }).then(r => r.data),

  getMyFamily: () =>
    apiClient.get<Family>('/families/me').then(r => r.data),

  leaveFamily: () =>
    apiClient.delete('/families/me/leave'),

  getActivity: () =>
    apiClient.get<FamilyActivity[]>('/families/me/activity').then(r => r.data),

  // ── Admin: member management ─────────────────────────────────────────────────
  removeMember: (userId: number) =>
    apiClient.delete(`/families/me/members/${userId}`),

  changeRole: (userId: number, role: 'admin' | 'member') =>
    apiClient.patch(`/families/me/members/${userId}/role`, { role }).then(r => r.data),

  // ── Admin: create invitation (via /me shorthand) ─────────────────────────────
  createInvitation: (data: InvitationCreate) =>
    apiClient.post<InvitationResponse>('/families/me/invitations', data).then(r => r.data),

  // ── Admin: send invite via explicit family ID (new endpoint) ─────────────────
  sendFamilyInvite: (familyId: number, data: InvitationCreate) =>
    apiClient.post<InvitationResponse>(`/families/${familyId}/invite`, data).then(r => r.data),

  // ── Admin: list & revoke ─────────────────────────────────────────────────────
  listInvitations: () =>
    apiClient.get<InvitationResponse[]>('/families/me/invitations').then(r => r.data),

  revokeInvitation: (id: number) =>
    apiClient.delete(`/families/me/invitations/${id}`),

  // ── Public: preview invite token — old path (kept for compatibility) ─────────
  previewInvitation: (token: string) =>
    apiClient.get<InvitationPreview>(`/invitations/${token}/preview`).then(r => r.data),

  // ── Public: preview via new /invites path ────────────────────────────────────
  getInvitePreview: (token: string) =>
    apiClient.get<InvitationPreview>(`/invites/${token}`).then(r => r.data),

  // ── Authenticated: accept (for users who already have an account) ────────────
  acceptInvitation: (token: string) =>
    apiClient.post(`/invitations/${token}/accept`).then(r => r.data),

  // ── Public: register + join in one step (primary invite flow for new users) ───
  acceptInviteWithRegistration: (token: string, data: InviteAcceptPayload) =>
    apiClient.post(`/invites/${token}/accept`, data).then(r => r.data),
}
