import { useState } from 'react'
import { Save, User } from 'lucide-react'
import { usersApi } from '../api/users'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'gain_muscle', label: 'Gain Muscle' },
  { value: 'maintain', label: 'Maintain Weight' },
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6',
  '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
]

export function Profile() {
  const { user, updateUser } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age?.toString() || '',
    height_cm: user?.height_cm?.toString() || '',
    gender: user?.gender || '',
    current_weight_kg: user?.current_weight_kg?.toString() || '',
    target_weight_kg: user?.target_weight_kg?.toString() || '',
    goal_type: user?.goal_type || '',
    daily_calorie_goal: user?.daily_calorie_goal?.toString() || '2000',
    daily_water_goal_ml: user?.daily_water_goal_ml?.toString() || '2500',
    avatar_color: user?.avatar_color || '#6366f1',
  })

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload: any = { name: form.name, avatar_color: form.avatar_color }
      if (form.age) payload.age = parseInt(form.age)
      if (form.height_cm) payload.height_cm = parseFloat(form.height_cm)
      if (form.gender) payload.gender = form.gender
      if (form.current_weight_kg) payload.current_weight_kg = parseFloat(form.current_weight_kg)
      if (form.target_weight_kg) payload.target_weight_kg = parseFloat(form.target_weight_kg)
      if (form.goal_type) payload.goal_type = form.goal_type
      if (form.daily_calorie_goal) payload.daily_calorie_goal = parseInt(form.daily_calorie_goal)
      if (form.daily_water_goal_ml) payload.daily_water_goal_ml = parseInt(form.daily_water_goal_ml)

      const updated = await usersApi.updateProfile(payload)
      updateUser(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar section */}
      <div className="card flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ backgroundColor: form.avatar_color }}
        >
          {form.name.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{form.name || 'Your Name'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {AVATAR_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => update('avatar_color', color)}
                className={`w-6 h-6 rounded-full transition-transform ${form.avatar_color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => update('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Age</label>
              <input type="number" className="input" placeholder="30" min={1} max={120} value={form.age} onChange={e => update('age', e.target.value)} />
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" className="input" placeholder="170" min={50} max={250} step="0.1" value={form.height_cm} onChange={e => update('height_cm', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Weight & Goals */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Weight & Goals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Current Weight (kg)</label>
              <input type="number" className="input" placeholder="70" min={20} max={400} step="0.1" value={form.current_weight_kg} onChange={e => update('current_weight_kg', e.target.value)} />
            </div>
            <div>
              <label className="label">Target Weight (kg)</label>
              <input type="number" className="input" placeholder="65" min={20} max={400} step="0.1" value={form.target_weight_kg} onChange={e => update('target_weight_kg', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Goal Type</label>
              <select className="input" value={form.goal_type} onChange={e => update('goal_type', e.target.value)}>
                <option value="">Select your goal</option>
                {GOAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Daily targets */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Daily Targets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Calorie Goal (kcal/day)</label>
              <input type="number" className="input" placeholder="2000" min={500} max={10000} value={form.daily_calorie_goal} onChange={e => update('daily_calorie_goal', e.target.value)} />
            </div>
            <div>
              <label className="label">Water Goal (ml/day)</label>
              <input type="number" className="input" placeholder="2500" min={500} max={10000} step="100" value={form.daily_water_goal_ml} onChange={e => update('daily_water_goal_ml', e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={saving}>
          {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save Profile</>}
        </button>
      </form>
    </div>
  )
}
