import { useEffect, useState } from 'react'
import { Plus, Trash2, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { weightsApi } from '../api/weights'
import type { WeightEntry } from '../types'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'
import { useAuthStore } from '../store/authStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format } from 'date-fns'

export function WeightTracking() {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () =>
    weightsApi.list({ limit: 90 }).then(setEntries).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await weightsApi.add({ weight_kg: parseFloat(form.weight_kg), notes: form.notes || undefined })
      setForm({ weight_kg: '', notes: '' })
      setShowForm(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await weightsApi.delete(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <PageLoader />

  const chartData = [...entries].reverse().map(e => ({
    date: format(new Date(e.logged_at), 'MMM d'),
    weight: e.weight_kg,
  }))

  const latest = entries[0]?.weight_kg
  const previous = entries[1]?.weight_kg
  const diff = latest && previous ? latest - previous : null

  const TrendIcon = diff === null ? Minus : diff < 0 ? TrendingDown : TrendingUp
  const trendColor = diff === null ? 'text-gray-400' : diff < 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {latest && (
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{latest} <span className="text-lg font-normal text-gray-500">kg</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Latest weight</p>
            </div>
          )}
          {diff !== null && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{Math.abs(diff).toFixed(1)} kg</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus className="w-4 h-4" /> Log Weight
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Log Weight Entry</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  className="input"
                  placeholder="70.5"
                  value={form.weight_kg}
                  onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  className="input"
                  placeholder="Morning weight, after gym..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Save Entry'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Progress Chart</h3>
            {user?.target_weight_kg && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Target: {user.target_weight_kg} kg
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-gray-500" />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                className="text-gray-500"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #1f2937)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: '#f9fafb',
                  fontSize: '0.8rem',
                }}
                formatter={(v: number) => [`${v} kg`, 'Weight']}
              />
              {user?.target_weight_kg && (
                <ReferenceLine y={user.target_weight_kg} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Target', fill: '#10b981', fontSize: 10 }} />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">History</h3>
        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <Scale className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No weight entries yet. Log your first weight!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const prev = entries[i + 1]
              const delta = prev ? entry.weight_kg - prev.weight_kg : null
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{entry.weight_kg} kg</p>
                      {entry.notes && <p className="text-xs text-gray-500 dark:text-gray-400">{entry.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {delta !== null && (
                      <span className={`text-xs font-medium ${delta < 0 ? 'text-green-500' : delta > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                      {format(new Date(entry.logged_at), 'MMM d, yyyy')}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {deletingId === entry.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
