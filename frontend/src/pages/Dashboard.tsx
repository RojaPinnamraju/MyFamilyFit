import { useEffect, useState } from 'react'
import { Scale, Flame, Droplets, Dumbbell, Target, Zap, TrendingUp, Users } from 'lucide-react'
import { usersApi } from '../api/users'
import { familiesApi } from '../api/families'
import { useAuthStore } from '../store/authStore'
import type { Dashboard as DashboardData, FamilyActivity } from '../types'
import { StatCard } from '../components/StatCard'
import { PageLoader } from '../components/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

export function Dashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activity, setActivity] = useState<FamilyActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      usersApi.getDashboard(),
      familiesApi.getActivity().catch(() => []),
    ]).then(([dash, act]) => {
      setData(dash)
      setActivity(act)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const goalLabel = (g?: string) => {
    if (g === 'lose_weight') return 'Lose Weight'
    if (g === 'gain_muscle') return 'Gain Muscle'
    if (g === 'maintain') return 'Maintain'
    return 'No goal set'
  }

  const activityIcon = (type: string) => {
    if (type === 'workout') return <Dumbbell className="w-3.5 h-3.5" />
    if (type === 'meal') return <Flame className="w-3.5 h-3.5" />
    return <Scale className="w-3.5 h-3.5" />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting()}, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Here's your fitness overview for today
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {data?.weekly_streak ?? 0} day streak
          </span>
        </div>
      </div>

      {/* Goal banner */}
      {data?.goal_type && (
        <div className="card bg-gradient-to-r from-primary-600 to-indigo-600 border-0 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-primary-100 text-sm">Current Goal</p>
                <p className="font-bold text-lg">{goalLabel(data.goal_type)}</p>
              </div>
            </div>
            {data.current_weight_kg && data.target_weight_kg && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-primary-200 text-xs">Current</p>
                  <p className="font-bold">{data.current_weight_kg} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-primary-200 text-xs">Target</p>
                  <p className="font-bold">{data.target_weight_kg} kg</p>
                </div>
                {data.goal_progress_pct !== null && data.goal_progress_pct !== undefined && (
                  <div className="text-center">
                    <p className="text-primary-200 text-xs">Progress</p>
                    <p className="font-bold">{data.goal_progress_pct}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {data.goal_progress_pct !== undefined && data.goal_progress_pct !== null && (
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-700"
                  style={{ width: `${data.goal_progress_pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Calories Today"
          value={data?.calories_today ?? 0}
          subtitle={`Goal: ${data?.calorie_goal ?? 2000} kcal`}
          icon={<Flame className="w-5 h-5" />}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          progress={data ? (data.calories_today / data.calorie_goal) * 100 : 0}
        />
        <StatCard
          title="Protein Today"
          value={`${data?.protein_today_g ?? 0}g`}
          subtitle="Keep it up!"
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Water Today"
          value={`${((data?.water_today_ml ?? 0) / 1000).toFixed(1)}L`}
          subtitle={`Goal: ${((data?.water_goal_ml ?? 2500) / 1000).toFixed(1)}L`}
          icon={<Droplets className="w-5 h-5" />}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          progress={data ? (data.water_today_ml / data.water_goal_ml) * 100 : 0}
        />
        <StatCard
          title="Workout"
          value={data?.workout_done_today ? 'Done!' : 'Not yet'}
          subtitle={data?.workout_name || 'Log your workout'}
          icon={<Dumbbell className="w-5 h-5" />}
          color={data?.workout_done_today
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
        />
      </div>

      {/* Family activity */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Family Activity</h3>
        </div>

        {activity.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No family activity yet. Join a family to see what everyone's up to!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: item.user_color }}
                >
                  {item.user_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{item.user_name}</span>{' '}
                    <span className="text-gray-500 dark:text-gray-400">{item.description}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                  {activityIcon(item.type)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
