import { useEffect, useState } from 'react'
import { Plus, Trash2, Dumbbell, Clock, ChevronDown, ChevronUp, X } from 'lucide-react'
import { workoutsApi, type ExerciseCreate } from '../api/workouts'
import type { WorkoutEntry, ExerciseCategory } from '../types'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_COLORS: Record<string, string> = {
  strength: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  cardio: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  flexibility: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  sports: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
}

const emptyExercise = (): ExerciseCreate => ({
  name: '',
  category: 'strength',
  sets: undefined,
  reps: undefined,
  weight_kg: undefined,
  duration_seconds: undefined,
  notes: '',
})

export function WorkoutTracking() {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', notes: '', duration_minutes: '' })
  const [exercises, setExercises] = useState<ExerciseCreate[]>([emptyExercise()])
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () =>
    workoutsApi.list({ limit: 50 }).then(setWorkouts).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const updateExercise = (i: number, field: string, value: any) => {
    setExercises(exs => exs.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const cleanExercises = exercises.filter(ex => ex.name.trim()).map(ex => ({
        ...ex,
        sets: ex.sets ? Number(ex.sets) : undefined,
        reps: ex.reps ? Number(ex.reps) : undefined,
        weight_kg: ex.weight_kg ? Number(ex.weight_kg) : undefined,
        duration_seconds: ex.duration_seconds ? Number(ex.duration_seconds) : undefined,
      }))
      await workoutsApi.add({
        name: form.name,
        notes: form.notes || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        exercises: cleanExercises,
      })
      setForm({ name: '', notes: '', duration_minutes: '' })
      setExercises([emptyExercise()])
      setShowForm(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    await workoutsApi.delete(id).catch(() => {})
    setWorkouts(prev => prev.filter(w => w.id !== id))
    setDeletingId(null)
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged</p>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus className="w-4 h-4" /> Log Workout
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Log New Workout</h3>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Workout Name *</label>
                <input className="input" placeholder="Morning Run, Chest Day..." value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" className="input" placeholder="45" min={1} value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <input className="input" placeholder="How did it go?" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Exercises</h4>
                <button
                  type="button"
                  onClick={() => setExercises(ex => [...ex, emptyExercise()])}
                  className="text-xs btn-secondary px-2 py-1"
                >
                  <Plus className="w-3 h-3" /> Add Exercise
                </button>
              </div>
              <div className="space-y-3">
                {exercises.map((ex, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium w-5">#{i + 1}</span>
                      <input className="input flex-1 text-sm py-1.5" placeholder="Exercise name" value={ex.name}
                        onChange={e => updateExercise(i, 'name', e.target.value)} />
                      <select className="input text-sm py-1.5 w-32" value={ex.category}
                        onChange={e => updateExercise(i, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {exercises.length > 1 && (
                        <button type="button" onClick={() => setExercises(exs => exs.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-7">
                      {ex.category !== 'cardio' && ex.category !== 'flexibility' ? (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Sets</label>
                            <input type="number" className="input text-sm py-1" placeholder="3" min={1}
                              value={ex.sets || ''} onChange={e => updateExercise(i, 'sets', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Reps</label>
                            <input type="number" className="input text-sm py-1" placeholder="12" min={1}
                              value={ex.reps || ''} onChange={e => updateExercise(i, 'reps', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Weight (kg)</label>
                            <input type="number" className="input text-sm py-1" placeholder="60" min={0} step="0.5"
                              value={ex.weight_kg || ''} onChange={e => updateExercise(i, 'weight_kg', e.target.value)} />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duration (sec)</label>
                          <input type="number" className="input text-sm py-1" placeholder="1800" min={1}
                            value={ex.duration_seconds || ''} onChange={e => updateExercise(i, 'duration_seconds', e.target.value)} />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <input className="input text-sm py-1" placeholder="..." value={ex.notes || ''}
                          onChange={e => updateExercise(i, 'notes', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Save Workout'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Workout list */}
      {workouts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-500">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No workouts logged yet. Start by logging your first workout!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map(workout => (
            <div key={workout.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                onClick={() => setExpandedId(expandedId === workout.id ? null : workout.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{workout.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(workout.logged_at), 'MMM d, yyyy')}
                    </span>
                    {workout.duration_minutes && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" /> {workout.duration_minutes}m
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(workout.id) }}
                    disabled={deletingId === workout.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {deletingId === workout.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  {expandedId === workout.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expandedId === workout.id && workout.exercises.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="mt-3 space-y-2">
                    {workout.exercises.map(ex => (
                      <div key={ex.id} className="flex items-center gap-3 py-2">
                        <span className={`badge ${CATEGORY_COLORS[ex.category]}`}>{ex.category}</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{ex.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}${ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}` : ''}
                          {ex.duration_seconds ? `${Math.floor(ex.duration_seconds / 60)}m ${ex.duration_seconds % 60}s` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  {workout.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{workout.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
