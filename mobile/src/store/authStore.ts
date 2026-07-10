import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('ff_token', token)
    await SecureStore.setItemAsync('ff_user', JSON.stringify(user))
    set({ user, token })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('ff_token')
    await SecureStore.deleteItemAsync('ff_user')
    set({ user: null, token: null })
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('ff_token')
      const userStr = await SecureStore.getItemAsync('ff_user')
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) })
      }
    } catch (_) {
      // ignore
    } finally {
      set({ isLoading: false })
    }
  },
}))
