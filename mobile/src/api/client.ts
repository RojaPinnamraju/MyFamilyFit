import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// For Expo Go on a physical device, replace with your machine's local IP:
// e.g. http://192.168.1.42:8000/api/v1
// For simulator/emulator, localhost works fine.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
)
