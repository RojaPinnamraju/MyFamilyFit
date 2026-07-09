export type GoalType = 'lose_weight' | 'gain_muscle' | 'maintain'
export type Gender = 'male' | 'female' | 'other'
export type FamilyRole = 'admin' | 'member'
export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'sports' | 'other'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface User {
  id: number
  email: string
  name: string
  age?: number
  height_cm?: number
  gender?: Gender
  current_weight_kg?: number
  target_weight_kg?: number
  goal_type?: GoalType
  daily_calorie_goal: number
  daily_water_goal_ml: number
  avatar_color: string
  created_at: string
}

export interface FamilyMember {
  id: number
  role: FamilyRole
  joined_at: string
  user: User
}

export interface Family {
  id: number
  name: string
  invite_code: string
  created_at: string
  members: FamilyMember[]
}

export interface WeightEntry {
  id: number
  user_id: number
  weight_kg: number
  notes?: string
  logged_at: string
  created_at: string
}

export interface Exercise {
  id: number
  workout_id: number
  name: string
  category: ExerciseCategory
  sets?: number
  reps?: number
  weight_kg?: number
  duration_seconds?: number
  notes?: string
}

export interface WorkoutEntry {
  id: number
  user_id: number
  name: string
  notes?: string
  duration_minutes?: number
  logged_at: string
  created_at: string
  exercises: Exercise[]
}

export interface MealItem {
  id: number
  meal_id: number
  name: string
  quantity?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

export interface MealEntry {
  id: number
  user_id: number
  meal_type: MealType
  notes?: string
  logged_at: string
  created_at: string
  items: MealItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

export interface WaterEntry {
  id: number
  user_id: number
  amount_ml: number
  logged_at: string
  created_at: string
}

export interface WaterSummary {
  total_ml: number
  goal_ml: number
  percentage: number
  entries: WaterEntry[]
}

export interface Dashboard {
  current_weight_kg?: number
  target_weight_kg?: number
  goal_type?: GoalType
  goal_progress_pct?: number
  weekly_streak: number
  calories_today: number
  calorie_goal: number
  protein_today_g: number
  water_today_ml: number
  water_goal_ml: number
  workout_done_today: boolean
  workout_name?: string
}

export interface FamilyActivity {
  type: 'workout' | 'meal' | 'weight'
  user_name: string
  user_color: string
  description: string
  timestamp: string
}
