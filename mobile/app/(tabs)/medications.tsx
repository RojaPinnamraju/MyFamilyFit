import { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import apiClient from '../../src/api/client'
import {
  scheduleMedReminders,
  sendImmediateMedReminder,
} from '../../src/utils/notifications'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Medication {
  id: number
  name: string
  dosage?: string
  frequency: string
  reminder_times: string[]
  food_timing: string
  notes?: string
  is_active: boolean
}

interface TodayItem {
  medication_id: number
  name: string
  dosage?: string
  reminder_time: string
  food_timing: string
  log_id?: number
  status?: 'taken' | 'skipped'
}

const FOOD_LABELS: Record<string, string> = {
  before: 'Before food',
  after:  'After food',
  with:   'With food',
  any:    'Any time',
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// ── Add medication modal ───────────────────────────────────────────────────────
function AddMedModal({ visible, onClose, onSaved }: {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [times, setTimes] = useState('08:00')
  const [foodTiming, setFoodTiming] = useState('any')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(''); setDosage(''); setFrequency('Daily')
    setTimes('08:00'); setFoodTiming('any'); setNotes('')
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return }
    setSaving(true)
    try {
      await apiClient.post('/medications', {
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        frequency: frequency.trim(),
        reminder_times: times.split(',').map(t => t.trim()).filter(Boolean),
        food_timing: foodTiming,
        notes: notes.trim() || undefined,
      })
      reset()
      onSaved()
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not save medication')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Medication</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ gap: 14 }}>
          <View>
            <Text style={styles.label}>Medication Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="e.g. Metformin" placeholderTextColor="#9CA3AF" />
          </View>
          <View>
            <Text style={styles.label}>Dosage</Text>
            <TextInput style={styles.input} value={dosage} onChangeText={setDosage}
              placeholder="e.g. 500 mg" placeholderTextColor="#9CA3AF" />
          </View>
          <View>
            <Text style={styles.label}>Frequency</Text>
            <TextInput style={styles.input} value={frequency} onChangeText={setFrequency}
              placeholder="e.g. Twice daily" placeholderTextColor="#9CA3AF" />
          </View>
          <View>
            <Text style={styles.label}>Reminder Times (comma separated)</Text>
            <TextInput style={styles.input} value={times} onChangeText={setTimes}
              placeholder="08:00, 20:00" placeholderTextColor="#9CA3AF" />
            <Text style={styles.hint}>24-hour format, e.g. 08:00 or 14:30</Text>
          </View>

          <View>
            <Text style={styles.label}>Food Timing</Text>
            <View style={styles.pills}>
              {['before','after','with','any'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pill, foodTiming === opt && styles.pillActive]}
                  onPress={() => setFoodTiming(opt)}
                >
                  <Text style={[styles.pillText, foodTiming === opt && styles.pillTextActive]}>
                    {FOOD_LABELS[opt]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 80 }]}
              value={notes} onChangeText={setNotes}
              placeholder="Any special instructions..." placeholderTextColor="#9CA3AF"
              multiline />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Add Medication</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function MedicationsScreen() {
  const [meds, setMeds] = useState<Medication[]>([])
  const [today, setToday] = useState<TodayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logging, setLogging] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    try {
      const [medsRes, todayRes] = await Promise.all([
        apiClient.get<Medication[]>('/medications'),
        apiClient.get<TodayItem[]>('/medications/today'),
      ])
      setMeds(medsRes.data)
      setToday(todayRes.data)
      // Reschedule local notifications whenever we reload
      scheduleMedReminders(medsRes.data).catch(() => {})
    } catch (e) {
      console.error('Failed to load medications', e)
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleLog = async (item: TodayItem, status: 'taken' | 'skipped') => {
    const key = `${item.medication_id}-${item.reminder_time}`
    setLogging(key)
    try {
      await apiClient.post(`/medications/${item.medication_id}/logs`, {
        log_date: todayStr(),
        reminder_time: item.reminder_time,
        status,
      })
      await load()
    } catch (e) {
      Alert.alert('Error', 'Could not update status')
    } finally {
      setLogging(null)
    }
  }

  const handleDelete = async (med: Medication) => {
    Alert.alert(
      'Delete Medication',
      `Delete "${med.name}"? This will remove all history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/medications/${med.id}`)
              await load()
            } catch {
              Alert.alert('Error', 'Could not delete medication')
            }
          },
        },
      ]
    )
  }

  const handleTestReminder = async (med: Medication) => {
    try {
      // Try push notification via backend
      await apiClient.post(`/medications/${med.id}/test-reminder`)
    } catch {
      // Fallback: local immediate notification
    }
    // Always show a local notification as well (works offline)
    await sendImmediateMedReminder(med.name, med.dosage)
    Alert.alert('Test Sent', `You should receive a notification for ${med.name} shortly.`)
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  const pending = today.filter(t => !t.status)
  const done    = today.filter(t => !!t.status)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medications</Text>
          <Text style={styles.subtitle}>
            {pending.length > 0
              ? `${pending.length} dose${pending.length > 1 ? 's' : ''} remaining today`
              : 'All caught up for today!'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Today's schedule */}
        {today.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {today.map(item => {
              const key = `${item.medication_id}-${item.reminder_time}`
              const isLogging = logging === key
              return (
                <View
                  key={key}
                  style={[
                    styles.scheduleCard,
                    item.status === 'taken'   && styles.cardTaken,
                    item.status === 'skipped' && styles.cardSkipped,
                  ]}
                >
                  <View style={styles.scheduleLeft}>
                    <Text style={styles.scheduleTime}>{item.reminder_time}</Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{item.name}</Text>
                    <Text style={styles.scheduleSubtitle}>
                      {[item.dosage, FOOD_LABELS[item.food_timing]].filter(Boolean).join(' · ')}
                    </Text>
                  </View>

                  {item.status ? (
                    <View style={[
                      styles.statusBadge,
                      item.status === 'taken' ? styles.badgeTaken : styles.badgeSkipped,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        item.status === 'taken' ? styles.textTaken : styles.textSkipped,
                      ]}>
                        {item.status === 'taken' ? '✓ Taken' : '✗ Skip'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnTaken]}
                        onPress={() => handleLog(item, 'taken')}
                        disabled={!!logging}
                      >
                        {isLogging
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Ionicons name="checkmark" size={16} color="#fff" />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnSkip]}
                        onPress={() => handleLog(item, 'skipped')}
                        disabled={!!logging}
                      >
                        <Ionicons name="close" size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* Summary */}
        {today.length > 0 && (
          <View style={styles.summary}>
            {[
              { label: 'Total',   value: today.length, color: '#374151' },
              { label: 'Taken',   value: done.filter(d => d.status === 'taken').length,   color: '#059669' },
              { label: 'Skipped', value: done.filter(d => d.status === 'skipped').length, color: '#DC2626' },
            ].map(s => (
              <View key={s.label} style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* My medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Medications ({meds.length})</Text>

          {meds.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No medications yet.</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first medication.</Text>
            </View>
          ) : (
            meds.map(med => (
              <View key={med.id} style={styles.medCard}>
                <View style={styles.medIcon}>
                  <Ionicons name="medkit" size={20} color="#7C3AED" />
                </View>
                <View style={styles.medInfo}>
                  <View style={styles.medNameRow}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.dosage && (
                      <View style={styles.dosageBadge}>
                        <Text style={styles.dosageText}>{med.dosage}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.medSub}>
                    {med.frequency} · {FOOD_LABELS[med.food_timing]}
                  </Text>
                  <Text style={styles.medTimes}>
                    🕐 {(med.reminder_times || []).join(', ')}
                  </Text>
                  {med.notes && (
                    <Text style={styles.medNotes} numberOfLines={1}>{med.notes}</Text>
                  )}
                </View>
                <View style={styles.medActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleTestReminder(med)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="notifications-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(med)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AddMedModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={load}
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff',
                 borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle:    { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5',
                 alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, gap: 16, paddingBottom: 40 },
  section:     { gap: 10 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },

  // Schedule cards
  scheduleCard:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                 borderRadius: 14, padding: 12, gap: 10,
                 borderWidth: 1, borderColor: '#F3F4F6' },
  cardTaken:   { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  cardSkipped: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  scheduleLeft:{ alignItems: 'center', minWidth: 48 },
  scheduleTime:{ fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  scheduleInfo:{ flex: 1 },
  scheduleTitle:{ fontSize: 14, fontWeight: '600', color: '#111827' },
  scheduleSubtitle:{ fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionRow:   { flexDirection: 'row', gap: 6 },
  actionBtn:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnTaken:    { backgroundColor: '#059669' },
  btnSkip:     { backgroundColor: '#F3F4F6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeTaken:  { backgroundColor: '#D1FAE5' },
  badgeSkipped:{ backgroundColor: '#FEE2E2' },
  statusText:  { fontSize: 12, fontWeight: '600' },
  textTaken:   { color: '#059669' },
  textSkipped: { color: '#DC2626' },

  // Summary
  summary:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
                 borderWidth: 1, borderColor: '#F3F4F6' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  summaryValue:{ fontSize: 22, fontWeight: '700' },
  summaryLabel:{ fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Med list cards
  medCard:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
                 padding: 12, gap: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  medIcon:     { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE',
                 alignItems: 'center', justifyContent: 'center' },
  medInfo:     { flex: 1, gap: 3 },
  medNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medName:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  dosageBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  dosageText:  { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  medSub:      { fontSize: 12, color: '#6B7280' },
  medTimes:    { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  medNotes:    { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  medActions:  { gap: 6, justifyContent: 'center' },
  iconBtn:     { padding: 4 },

  // Empty state
  empty:       { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:   { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  emptySubtext:{ fontSize: 13, color: '#9CA3AF' },

  // Modal
  modal:       { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: '700', color: '#111827' },
  label:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:       { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
                 borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                 fontSize: 15, color: '#111827' },
  hint:        { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  pills:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                 backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  pillActive:  { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  pillText:    { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  pillTextActive:{ color: '#7C3AED', fontWeight: '600' },
  btnPrimary:  { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14,
                 alignItems: 'center', marginTop: 8 },
  btnPrimaryText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
})
