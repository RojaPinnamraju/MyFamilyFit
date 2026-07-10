export interface User {
  id: number
  email: string
  name: string
  age?: number
  height_cm?: number
  current_weight_kg?: number
  target_weight_kg?: number
  goal_type?: 'lose_weight' | 'gain_muscle' | 'maintain'
  daily_calorie_goal?: number
  daily_water_goal_ml?: number
  avatar_color: string
  avatar_url?: string
  auth_provider: string
  is_active: boolean
  created_at: string
}

export interface Family {
  id: number
  name: string
  created_at: string
}

export interface FamilyMember {
  id: number
  user_id: number
  family_id: number
  role: 'admin' | 'member'
  user: User
  joined_at: string
}

export interface WeightEntry {
  id: number
  weight_kg: number
  notes?: string
  recorded_at: string
}

export interface WorkoutLog {
  id: number
  name: string
  workout_type: string
  duration_minutes?: number
  calories_burned?: number
  notes?: string
  logged_at: string
}

export interface MealLog {
  id: number
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  logged_at: string
}

export interface WaterLog {
  id: number
  amount_ml: number
  logged_at: string
}

export interface DashboardStats {
  today_calories: number
  today_water_ml: number
  today_workouts: number
  weekly_weight_change?: number
}
