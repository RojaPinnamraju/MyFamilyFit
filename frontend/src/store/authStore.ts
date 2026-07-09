import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  updateUser: (user: User) => void
  logout: () => void
}

const stored = {
  user: (() => {
    try { return JSON.parse(localStorage.getItem('ff_user') || 'null') } catch { return null }
  })(),
  token: localStorage.getItem('ff_token'),
}

export const useAuthStore = create<AuthState>((set) => ({
  user: stored.user,
  token: stored.token,
  isAuthenticated: !!stored.token,

  setAuth: (user, token) => {
    localStorage.setItem('ff_token', token)
    localStorage.setItem('ff_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  updateUser: (user) => {
    localStorage.setItem('ff_user', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('ff_token')
    localStorage.removeItem('ff_user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
