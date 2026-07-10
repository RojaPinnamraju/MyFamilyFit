import { useEffect, useState } from 'react'
import { Flame, TrendingUp, Wheat, Droplets, Activity, Info } from 'lucide-react'
import { nutritionApi } from '../api/nutrition'
import type { NutritionTargets } from '../types'
import { PageLoader } from '../components/LoadingSpinner'

const MEAL_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅' },
  lunch:     { label: 'Lunch',     emoji: '☀️' },
  dinner:    { label: 'Dinner',    emoji: '🌙' },
  snack:     { label: 'Snack',     emoji: '🍎' },
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:   'Sedentary (little or no exercise)',
  light:       'Lightly active (1–3 days/week)',
  moderate:    'Moderately active (3–5 days/week)',
  active:      'Very active (6–7 days/week)',
  very_active: 'Extra active (athlete / physical job)',
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight:  'Lose Weight',
  gain_muscle:  'Gain Muscle',
  maintain:     'Maintain Weight',
}

function MacroBar({ label, value, pct, color, unit = 'g', icon }: {
  label: string; value: number; pct: number; color: string; unit?: string; icon: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
          {icon}
          {label}
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">
          {value}{unit} <span className="text-gray-400 dark:text-gray-500 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatBadge({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function NutritionPage() {
  const [data, setData] = useState<NutritionTargets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    nutritionApi.getTargets()
      .then(setData)
      .catch(() => setError('Could not load nutrition targets. Make sure your profile (age, weight, height, goal) is complete.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <Info className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {error || 'No nutrition data available.'}
          </p>
          <a href="/profile" className="btn-primary mt-4 inline-flex">Complete your profile →</a>
        </div>
      </div>
    )
  }

  const { bmr, tdee, target_calories, goal_type, activity_level, macros, meal_targets } = data

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutrition Recommendations</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Personalised targets based on your Mifflin-St Jeor BMR · {ACTIVITY_LABELS[activity_level] ?? activity_level}
        </p>
      </div>

      {/* BMR / TDEE / Target */}
      <div className="grid grid-cols-3 gap-4">
        <StatBadge label="BMR" value={`${bmr} kcal`} sub="At rest" />
        <StatBadge label="TDEE" value={`${tdee} kcal`} sub="Total burn" />
        <StatBadge
          label="Daily Target"
          value={`${target_calories} kcal`}
          sub={GOAL_LABELS[goal_type] ?? goal_type}
        />
      </div>

      {/* Goal info chip */}
      <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl text-sm text-primary-700 dark:text-primary-400">
        <Activity className="w-4 h-4 flex-shrink-0" />
        Goal: <strong>{GOAL_LABELS[goal_type] ?? goal_type}</strong> —
        {goal_type === 'lose_weight' && ' 500 kcal deficit for ~0.5 kg/week loss'}
        {goal_type === 'gain_muscle' && ' 300 kcal surplus for lean muscle gain'}
        {goal_type === 'maintain' && ' eating at your TDEE to maintain weight'}
      </div>

      {/* Macros */}
      <div className="card space-y-5">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Daily Macro Targets
        </h3>
        <MacroBar
          label="Protein"
          value={macros.protein_g}
          pct={macros.protein_pct}
          color="bg-green-500"
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
        <MacroBar
          label="Carbohydrates"
          value={macros.carbs_g}
          pct={macros.carbs_pct}
          color="bg-amber-400"
          icon={<Wheat className="w-4 h-4 text-amber-500" />}
        />
        <MacroBar
          label="Fat"
          value={macros.fat_g}
          pct={macros.fat_pct}
          color="bg-rose-400"
          icon={<Droplets className="w-4 h-4 text-rose-400" />}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
          Protein 4 kcal/g · Carbs 4 kcal/g · Fat 9 kcal/g
        </p>
      </div>

      {/* Meal breakdown */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
          <Flame className="w-5 h-5 text-orange-500" />
          Meal-wise Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(meal_targets) as [string, typeof meal_targets.breakfast][]).map(([key, t]) => {
            const meta = MEAL_LABELS[key] ?? { label: key, emoji: '🍽️' }
            const pct = Math.round((t.calories / target_calories) * 100)
            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-lg">{meta.emoji}</span> {meta.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{pct}% of daily</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{t.calories} <span className="text-sm font-normal text-gray-400">kcal</span></p>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">{t.protein_g}g</p>
                    <p className="text-gray-400">Protein</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">{t.carbs_g}g</p>
                    <p className="text-gray-400">Carbs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-500 dark:text-rose-400">{t.fat_g}g</p>
                    <p className="text-gray-400">Fat</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800">
        <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-3">💡 Nutrition Insights</h3>
        <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-400">
          {goal_type === 'lose_weight' && (
            <>
              <li>• Prioritise protein to preserve muscle while in a calorie deficit.</li>
              <li>• Spread meals evenly to avoid hunger spikes.</li>
              <li>• Track your meals in the Meals tab to stay on target.</li>
            </>
          )}
          {goal_type === 'gain_muscle' && (
            <>
              <li>• Eat protein within 30–60 min after a workout for best recovery.</li>
              <li>• Carbs fuel your training — don't skip them around workouts.</li>
              <li>• Aim for at least 1.6 g of protein per kg of body weight.</li>
            </>
          )}
          {goal_type === 'maintain' && (
            <>
              <li>• Balanced macros help maintain energy levels throughout the day.</li>
              <li>• Vary your food sources to hit micronutrient targets.</li>
              <li>• Drink at least your water goal daily — it supports metabolism.</li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
