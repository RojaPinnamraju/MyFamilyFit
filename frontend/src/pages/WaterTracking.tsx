import { useEffect, useState } from 'react'
import { Droplets, Plus, Trash2, Target } from 'lucide-react'
import { waterApi } from '../api/water'
import type { WaterSummary } from '../types'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'

const QUICK_AMOUNTS = [150, 250, 350, 500]

export function WaterTracking() {
  const [summary, setSummary] = useState<WaterSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [custom, setCustom] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () =>
    waterApi.getToday().then(setSummary).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleAdd = async (ml: number) => {
    setAdding(true)
    await waterApi.add(ml).catch(() => {})
    await load()
    setAdding(false)
  }

  const handleCustomAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const ml = parseInt(custom)
    if (!ml || ml < 1) return
    await handleAdd(ml)
    setCustom('')
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    await waterApi.delete(id).catch(() => {})
    setSummary(prev => prev ? {
      ...prev,
      entries: prev.entries.filter(e => e.id !== id),
      total_ml: prev.total_ml - (prev.entries.find(e => e.id === id)?.amount_ml || 0),
    } : prev)
    setDeletingId(null)
    load()
  }

  if (loading) return <PageLoader />

  const total = summary?.total_ml ?? 0
  const goal = summary?.goal_ml ?? 2500
  const pct = Math.min((total / goal) * 100, 100)
  const remaining = Math.max(goal - total, 0)

  // Water fill visualization: 8 glasses
  const glasses = Math.floor(total / (goal / 8))

  const fillColor = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-blue-400' : 'bg-blue-300'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Main progress card */}
      <div className="card text-center">
        {/* Circular-ish progress */}
        <div className="relative inline-flex items-center justify-center w-44 h-44 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="12" />
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke="currentColor" className="text-blue-500 transition-all duration-700"
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 68}`}
              strokeDashoffset={`${2 * Math.PI * 68 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(total / 1000).toFixed(1)}L
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">of {(goal / 1000).toFixed(1)}L</p>
          </div>
        </div>

        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {pct >= 100 ? '🎉 Goal reached!' : `${remaining}ml to go`}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{Math.round(pct)}% of daily goal</p>

        {/* Glass icons */}
        <div className="flex justify-center gap-2 mb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`w-6 h-8 rounded-b-lg border-2 transition-colors ${
              i < glasses
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300 dark:border-gray-600 bg-transparent'
            }`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{glasses}/8 glasses</p>
      </div>

      {/* Quick add */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Add</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {QUICK_AMOUNTS.map(ml => (
            <button
              key={ml}
              onClick={() => handleAdd(ml)}
              disabled={adding}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20
                         border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-400 dark:hover:border-blue-600
                         transition-colors group"
            >
              <Droplets className="w-5 h-5 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{ml}ml</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ml < 200 ? 'Small' : ml < 350 ? 'Cup' : ml < 450 ? 'Bottle' : 'Large'}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomAdd} className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              className="input"
              placeholder="Custom amount (ml)"
              min={1}
              max={2000}
              value={custom}
              onChange={e => setCustom(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? <LoadingSpinner size="sm" /> : <><Plus className="w-4 h-4" /> Add</>}
          </button>
        </form>
      </div>

      {/* Today's entries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Today's Intake</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{summary?.entries.length ?? 0} entries</span>
        </div>

        {!summary?.entries.length ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Droplets className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No water logged today. Stay hydrated!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{entry.amount_ml} ml</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(entry.logged_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {deletingId === entry.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal info */}
      <div className="card flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
        <Target className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your daily water goal is <strong>{(goal / 1000).toFixed(1)}L</strong>. Update it in your profile settings.
        </p>
      </div>
    </div>
  )
}
