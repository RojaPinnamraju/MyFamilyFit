import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ff_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ff_token')
      localStorage.removeItem('ff_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
