import { useEffect, useState } from 'react'
import { Plus, Trash2, Utensils, Flame, ChevronDown, ChevronUp, X } from 'lucide-react'
import { mealsApi, type MealItemCreate } from '../api/meals'
import type { MealEntry, MealType } from '../types'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuthStore } from '../store/authStore'

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
]

const emptyItem = (): MealItemCreate => ({ name: '', quantity: '', calories: undefined, protein_g: undefined, carbs_g: undefined, fat_g: undefined })

export function MealTracking() {
  const { user } = useAuthStore()
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ meal_type: 'breakfast' as MealType, notes: '' })
  const [items, setItems] = useState<MealItemCreate[]>([emptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () =>
    mealsApi.list({ limit: 50 }).then(setMeals).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const updateItem = (i: number, field: string, value: any) => {
    setItems(its => its.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const cleanItems = items.filter(it => it.name.trim()).map(it => ({
        ...it,
        calories: it.calories ? Number(it.calories) : undefined,
        protein_g: it.protein_g ? Number(it.protein_g) : undefined,
        carbs_g: it.carbs_g ? Number(it.carbs_g) : undefined,
        fat_g: it.fat_g ? Number(it.fat_g) : undefined,
      }))
      await mealsApi.add({ meal_type: form.meal_type, notes: form.notes || undefined, items: cleanItems })
      setForm({ meal_type: 'breakfast', notes: '' })
      setItems([emptyItem()])
      setShowForm(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    await mealsApi.delete(id).catch(() => {})
    setMeals(prev => prev.filter(m => m.id !== id))
    setDeletingId(null)
  }

  if (loading) return <PageLoader />

  // Today's totals
  const today = new Date().toDateString()
  const todayMeals = meals.filter(m => new Date(m.logged_at).toDateString() === today)
  const totalCals = todayMeals.reduce((s, m) => s + m.total_calories, 0)
  const totalProtein = todayMeals.reduce((s, m) => s + m.total_protein, 0)
  const totalCarbs = todayMeals.reduce((s, m) => s + m.total_carbs, 0)
  const totalFat = todayMeals.reduce((s, m) => s + m.total_fat, 0)
  const calorieGoal = user?.daily_calorie_goal || 2000

  const macroData = [
    { name: 'Protein', value: Math.round(totalProtein), color: '#6366f1' },
    { name: 'Carbs', value: Math.round(totalCarbs), color: '#f59e0b' },
    { name: 'Fat', value: Math.round(totalFat), color: '#ec4899' },
  ]

  const getMealLabel = (type: string) => MEAL_TYPES.find(t => t.value === type)?.label || type
  const getMealEmoji = (type: string) => MEAL_TYPES.find(t => t.value === type)?.emoji || '🍽️'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{meals.length} meal{meals.length !== 1 ? 's' : ''} logged</p>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus className="w-4 h-4" /> Log Meal
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Calories', value: `${totalCals}`, sub: `/ ${calorieGoal} kcal`, color: 'text-orange-600 dark:text-orange-400', pct: (totalCals / calorieGoal) * 100 },
          { label: 'Protein', value: `${Math.round(totalProtein)}g`, sub: 'today', color: 'text-primary-600 dark:text-primary-400', pct: null },
          { label: 'Carbs', value: `${Math.round(totalCarbs)}g`, sub: 'today', color: 'text-amber-600 dark:text-amber-400', pct: null },
          { label: 'Fat', value: `${Math.round(totalFat)}g`, sub: 'today', color: 'text-pink-600 dark:text-pink-400', pct: null },
        ].map(({ label, value, sub, color, pct }) => (
          <div key={label} className="card">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label} Today</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
            {pct !== null && (
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Macro chart */}
      {(totalProtein + totalCarbs + totalFat) > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Today's Macros (g)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={macroData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
              <Tooltip formatter={(v: number) => [`${v}g`]} contentStyle={{ borderRadius: '0.75rem', border: 'none', backgroundColor: '#1f2937', color: '#f9fafb', fontSize: '0.8rem' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {macroData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Log Meal</h3>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, meal_type: t.value }))}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-medium transition-colors ${
                    form.meal_type === t.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-xl mb-1">{t.emoji}</div>
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Meal notes..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Food Items</h4>
                <button type="button" onClick={() => setItems(its => [...its, emptyItem()])} className="btn-secondary text-xs px-2 py-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 space-y-2">
                    <div className="flex gap-2">
                      <input className="input flex-1 text-sm py-1.5" placeholder="Food name" value={item.name}
                        onChange={e => updateItem(i, 'name', e.target.value)} />
                      <input className="input w-24 text-sm py-1.5" placeholder="Qty" value={item.quantity || ''}
                        onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(its => its.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'calories', label: 'Cal', type: 'integer' },
                        { key: 'protein_g', label: 'Protein(g)', type: 'decimal' },
                        { key: 'carbs_g', label: 'Carbs(g)', type: 'decimal' },
                        { key: 'fat_g', label: 'Fat(g)', type: 'decimal' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                          <input type="number" min={0} step="0.1" className="input text-sm py-1"
                            value={(item as any)[key] || ''}
                            onChange={e => updateItem(i, key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Save Meal'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Meal list */}
      {meals.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-500">
          <Utensils className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No meals logged yet. Start tracking your nutrition!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => (
            <div key={meal.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
              >
                <div className="text-2xl">{getMealEmoji(meal.meal_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{getMealLabel(meal.meal_type)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(meal.logged_at), 'MMM d, h:mm a')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                      <Flame className="w-3 h-3" /> {meal.total_calories} cal
                    </span>
                    <span className="text-xs text-primary-600 dark:text-primary-400">
                      P: {Math.round(meal.total_protein)}g
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(meal.id) }}
                    disabled={deletingId === meal.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {deletingId === meal.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  {expandedId === meal.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expandedId === meal.id && meal.items.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                  <table className="w-full mt-3 text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 text-left">
                        <th className="pb-2 font-medium">Item</th>
                        <th className="pb-2 font-medium text-right">Cal</th>
                        <th className="pb-2 font-medium text-right hidden sm:table-cell">P(g)</th>
                        <th className="pb-2 font-medium text-right hidden sm:table-cell">C(g)</th>
                        <th className="pb-2 font-medium text-right hidden sm:table-cell">F(g)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {meal.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-1.5">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                            {item.quantity && <span className="text-gray-400 ml-1.5 text-xs">{item.quantity}</span>}
                          </td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{item.calories ?? '—'}</td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{item.protein_g ?? '—'}</td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{item.carbs_g ?? '—'}</td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{item.fat_g ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right">{meal.total_calories}</td>
                        <td className="pt-2 text-right hidden sm:table-cell">{Math.round(meal.total_protein)}</td>
                        <td className="pt-2 text-right hidden sm:table-cell">{Math.round(meal.total_carbs)}</td>
                        <td className="pt-2 text-right hidden sm:table-cell">{Math.round(meal.total_fat)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
