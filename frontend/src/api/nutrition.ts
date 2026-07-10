import apiClient from './client'
import type { NutritionTargets } from '../types'

export const nutritionApi = {
  getTargets: () =>
    apiClient.get<NutritionTargets>('/users/me/nutrition').then(r => r.data),
}
