import { useEffect, useState } from 'react'
import { Pill, Plus, Check, X, Clock, Pencil, Trash2, ChevronDown, ChevronUp, BarChart2, Bell, BellOff } from 'lucide-react'
import { medicationsApi, type MedicationCreate } from '../api/medications'
import type { Medication, TodayMedItem, MedicationLog } from '../types'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'

// ── Browser notification helpers ──────────────────────────────────────────────
async function requestBrowserNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function scheduleBrowserReminders(meds: Medication[]) {
  // Clear any previous timers stored on window
  const w = window as any
  if (w._medTimers) w._medTimers.forEach(clearTimeout)
  w._medTimers = []

  if (Notification.permission !== 'granted') return

  const now = new Date()
  for (const med of meds) {
    for (const timeStr of med.reminder_times || []) {
      const [h, m] = timeStr.split(':').map(Number)
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
      if (target <= now) continue                 // already past today
      const delay = target.getTime() - now.getTime()
      const timer = window.setTimeout(() => {
        const body = [med.dosage, { before: 'Before food', after: 'After food', with: 'With food' }[med.food_timing] ?? '']
          .filter(Boolean).join(' · ')
        new Notification(`💊 ${med.name}`, { body: body || 'Time for your medication', icon: '/favicon.ico' })
      }, delay)
      w._medTimers.push(timer)
    }
  }
}

const FOOD_TIMING_LABELS: Record<string, string> = {
  before: 'Before food',
  after:  'After food',
  with:   'With food',
  any:    'Any time',
}

const STATUS_COLORS: Record<string, string> = {
  taken:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  skipped: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Add/Edit dialog ────────────────────────────────────────────────────────────
interface MedFormProps {
  initial?: Medication
  onSave: (data: MedicationCreate) => Promise<void>
  onCancel: () => void
}

function MedForm({ initial, onSave, onCancel }: MedFormProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name || '',
    dosage: initial?.dosage || '',
    frequency: initial?.frequency || 'Daily',
    food_timing: initial?.food_timing || 'any',
    notes: initial?.notes || '',
    reminder_times: (initial?.reminder_times || ['08:00']).join(', '),
  })

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: form.name,
        dosage: form.dosage || undefined,
        frequency: form.frequency,
        food_timing: form.food_timing,
        notes: form.notes || undefined,
        reminder_times: form.reminder_times.split(',').map(t => t.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Medication' : 'Add Medication'}
          </h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Medication Name *</label>
            <input className="input" value={form.name} onChange={e => u('name', e.target.value)} required placeholder="e.g. Metformin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosage</label>
              <input className="input" value={form.dosage} onChange={e => u('dosage', e.target.value)} placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="label">Frequency *</label>
              <input className="input" value={form.frequency} onChange={e => u('frequency', e.target.value)} required placeholder="e.g. Twice daily" />
            </div>
          </div>
          <div>
            <label className="label">Reminder Times (comma separated)</label>
            <input className="input" value={form.reminder_times} onChange={e => u('reminder_times', e.target.value)} placeholder="08:00, 20:00" />
            <p className="text-xs text-gray-400 mt-1">Use 24-hour format, e.g. 08:00, 14:30</p>
          </div>
          <div>
            <label className="label">Food Timing</label>
            <select className="input" value={form.food_timing} onChange={e => u('food_timing', e.target.value)}>
              <option value="before">Before food</option>
              <option value="after">After food</option>
              <option value="with">With food</option>
              <option value="any">Any time</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => u('notes', e.target.value)} placeholder="Any special instructions..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors">Cancel</button>
            <button type="submit" className="flex-1 btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : (initial ? 'Save Changes' : 'Add Medication')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── History drawer ─────────────────────────────────────────────────────────────
function HistoryDrawer({ med, onClose }: { med: Medication; onClose: () => void }) {
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    medicationsApi.getLogs(med.id).then(setLogs).finally(() => setLoading(false))
  }, [med.id])

  const taken = logs.filter(l => l.status === 'taken').length
  const adherence = logs.length ? Math.round((taken / logs.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{med.name} — History</h3>
            {logs.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {adherence}% adherence · {taken}/{logs.length} doses taken
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No history yet.</div>
        ) : (
          <div className="overflow-y-auto p-5 space-y-2">
            {/* Adherence bar */}
            <div className="mb-4 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Adherence</span><span>{adherence}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${adherence}%` }} />
              </div>
            </div>
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{log.log_date}</p>
                  {log.reminder_time && <p className="text-xs text-gray-400">{log.reminder_time}</p>}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[log.status] ?? ''}`}>
                  {log.status === 'taken' ? '✓ Taken' : '✗ Skipped'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([])
  const [today, setToday] = useState<TodayMedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState<string | null>(null) // `${medId}-${time}`
  const [showForm, setShowForm] = useState(false)
  const [editMed, setEditMed] = useState<Medication | null>(null)
  const [historyMed, setHistoryMed] = useState<Medication | null>(null)
  const [showAll, setShowAll] = useState(false)

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const reload = async () => {
    const [m, t] = await Promise.all([medicationsApi.list(), medicationsApi.getToday()])
    setMeds(m)
    setToday(t)
    scheduleBrowserReminders(m)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const handleEnableNotifications = async () => {
    const granted = await requestBrowserNotifPermission()
    setNotifPermission(granted ? 'granted' : 'denied')
    if (granted) scheduleBrowserReminders(meds)
  }

  const handleLog = async (item: TodayMedItem, status: 'taken' | 'skipped') => {
    const key = `${item.medication_id}-${item.reminder_time}`
    setLogging(key)
    try {
      await medicationsApi.log(item.medication_id, status, item.reminder_time, todayStr())
      await reload()
    } finally {
      setLogging(null)
    }
  }

  const handleCreate = async (data: MedicationCreate) => {
    await medicationsApi.create(data)
    await reload()
    setShowForm(false)
  }

  const handleUpdate = async (data: MedicationCreate) => {
    if (!editMed) return
    await medicationsApi.update(editMed.id, data)
    await reload()
    setEditMed(null)
  }

  const handleDelete = async (med: Medication) => {
    if (!confirm(`Delete "${med.name}"?`)) return
    await medicationsApi.remove(med.id)
    await reload()
  }

  if (loading) return <PageLoader />

  const pending = today.filter(t => !t.status)
  const done    = today.filter(t => !!t.status)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Medications</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track your daily medication schedule</p>
        </div>
        <div className="flex gap-2">
          {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
            <button
              onClick={handleEnableNotifications}
              className="btn-secondary flex items-center gap-2"
              title="Enable browser notifications for medication reminders"
            >
              <Bell className="w-4 h-4" /> Enable Reminders
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <Bell className="w-3.5 h-3.5" /> Reminders on
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Today's schedule */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Today's Schedule
          {pending.length > 0 && (
            <span className="ml-auto text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </h3>

        {today.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No medications scheduled. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {today.map(item => {
              const key = `${item.medication_id}-${item.reminder_time}`
              const isLogging = logging === key
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                    item.status === 'taken'
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'
                      : item.status === 'skipped'
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {/* Time */}
                  <div className="text-center min-w-[3.5rem]">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.reminder_time}</p>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.dosage && `${item.dosage} · `}{FOOD_TIMING_LABELS[item.food_timing]}
                    </p>
                  </div>

                  {/* Status or action buttons */}
                  {item.status ? (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[item.status]}`}>
                      {item.status === 'taken' ? '✓ Taken' : '✗ Skipped'}
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLog(item, 'taken')}
                        disabled={!!logging}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isLogging ? <LoadingSpinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
                        Taken
                      </button>
                      <button
                        onClick={() => handleLog(item, 'skipped')}
                        disabled={!!logging}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Adherence summary */}
      {today.length > 0 && (
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Total', value: today.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Taken', value: done.filter(d => d.status === 'taken').length, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Skipped', value: done.filter(d => d.status === 'skipped').length, color: 'text-red-500 dark:text-red-400' },
          ].map(s => (
            <div key={s.label} className="card py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* My medications list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            My Medications ({meds.length})
          </h3>
          {meds.length > 3 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1"
            >
              {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all</>}
            </button>
          )}
        </div>

        {meds.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No medications yet. Tap "Add" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {(showAll ? meds : meds.slice(0, 3)).map(med => (
              <div
                key={med.id}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{med.name}</p>
                    {med.dosage && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        {med.dosage}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {med.frequency} · {FOOD_TIMING_LABELS[med.food_timing]} · {(med.reminder_times || []).join(', ')}
                  </p>
                  {med.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{med.notes}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => medicationsApi.testReminder(med.id).then(() =>
                      alert(`Test notification sent for ${med.name}`)
                    ).catch(() => alert('No push token registered — open the mobile app first'))}
                    className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-gray-400 hover:text-violet-600 dark:text-gray-500 dark:hover:text-violet-400"
                    title="Send test push notification"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHistoryMed(med)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500"
                    title="History"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditMed(med)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(med)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && <MedForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}
      {editMed && <MedForm initial={editMed} onSave={handleUpdate} onCancel={() => setEditMed(null)} />}
      {historyMed && <HistoryDrawer med={historyMed} onClose={() => setHistoryMed(null)} />}
    </div>
  )
}
