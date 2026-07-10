import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { workoutApi, mealApi, waterApi } from '../../src/api/tracking'

type Tab = 'workout' | 'meal' | 'water'

export default function LogScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('workout')

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Log Activity</Text>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['workout', 'meal', 'water'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'workout' ? '🏋️ Workout' : t === 'meal' ? '🍽️ Meal' : '💧 Water'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'workout' && <WorkoutForm />}
        {tab === 'meal'    && <MealForm />}
        {tab === 'water'   && <WaterForm />}
      </ScrollView>
    </View>
  )
}

// ── Workout ───────────────────────────────────────────────────────────────────
function WorkoutForm() {
  const [name, setName]         = useState('')
  const [type, setType]         = useState('')
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!name) { Alert.alert('Enter a workout name'); return }
    setLoading(true)
    try {
      await workoutApi.log({
        name,
        workout_type: type || 'general',
        duration_minutes: duration ? parseInt(duration) : undefined,
        calories_burned:  calories ? parseInt(calories) : undefined,
      })
      Alert.alert('✅ Workout logged!')
      setName(''); setType(''); setDuration(''); setCalories('')
    } catch {
      Alert.alert('Failed to log workout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <Label>Workout Name *</Label>
      <Input placeholder="e.g. Morning Run" value={name} onChangeText={setName} />
      <Label>Type</Label>
      <Input placeholder="e.g. cardio, strength" value={type} onChangeText={setType} />
      <Label>Duration (minutes)</Label>
      <Input placeholder="30" keyboardType="number-pad" value={duration} onChangeText={setDuration} />
      <Label>Calories Burned</Label>
      <Input placeholder="250" keyboardType="number-pad" value={calories} onChangeText={setCalories} />
      <SubmitBtn onPress={submit} loading={loading} label="Log Workout" color="#10B981" />
    </View>
  )
}

// ── Meal ──────────────────────────────────────────────────────────────────────
function MealForm() {
  const [name, setName]         = useState('')
  const [mealType, setMealType] = useState<'breakfast'|'lunch'|'dinner'|'snack'>('lunch')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!name) { Alert.alert('Enter a meal name'); return }
    setLoading(true)
    try {
      await mealApi.log({
        name, meal_type: mealType,
        calories:  calories ? parseInt(calories) : undefined,
        protein_g: protein  ? parseFloat(protein) : undefined,
      })
      Alert.alert('✅ Meal logged!')
      setName(''); setCalories(''); setProtein('')
    } catch {
      Alert.alert('Failed to log meal')
    } finally {
      setLoading(false)
    }
  }

  const types: Array<'breakfast'|'lunch'|'dinner'|'snack'> = ['breakfast','lunch','dinner','snack']

  return (
    <View style={styles.form}>
      <Label>Meal Name *</Label>
      <Input placeholder="e.g. Chicken Salad" value={name} onChangeText={setName} />
      <Label>Meal Type</Label>
      <View style={styles.chipRow}>
        {types.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, mealType === t && styles.chipActive]}
            onPress={() => setMealType(t)}
          >
            <Text style={[styles.chipText, mealType === t && styles.chipTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Label>Calories</Label>
      <Input placeholder="400" keyboardType="number-pad" value={calories} onChangeText={setCalories} />
      <Label>Protein (g)</Label>
      <Input placeholder="30" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
      <SubmitBtn onPress={submit} loading={loading} label="Log Meal" color="#F59E0B" />
    </View>
  )
}

// ── Water ─────────────────────────────────────────────────────────────────────
function WaterForm() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const quickAdd = async (ml: number) => {
    setLoading(true)
    try {
      await waterApi.log(ml)
      Alert.alert(`✅ Added ${ml}ml!`)
    } catch {
      Alert.alert('Failed to log water')
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    const ml = parseInt(amount)
    if (!ml || ml <= 0) { Alert.alert('Enter a valid amount'); return }
    await quickAdd(ml)
    setAmount('')
  }

  return (
    <View style={styles.form}>
      <Text style={styles.waterEmoji}>💧</Text>
      <Text style={styles.waterTitle}>Log Water Intake</Text>

      <View style={styles.quickRow}>
        {[150, 250, 350, 500].map((ml) => (
          <TouchableOpacity key={ml} style={styles.quickBtn} onPress={() => quickAdd(ml)} disabled={loading}>
            <Text style={styles.quickText}>{ml}ml</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Label>Custom Amount (ml)</Label>
      <Input placeholder="300" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <SubmitBtn onPress={submit} loading={loading} label="Log Water" color="#3B82F6" />
    </View>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>
}

function Input(props: any) {
  return <TextInput style={styles.input} placeholderTextColor="#9CA3AF" {...props} />
}

function SubmitBtn({ onPress, loading, label, color }: {
  onPress: () => void; loading: boolean; label: string; color: string
}) {
  return (
    <TouchableOpacity
      style={[styles.submitBtn, { backgroundColor: color }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.submitText}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: '#F9FAFB' },
  title:      { fontSize: 22, fontWeight: '800', color: '#111827', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  tabRow:     { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  tabBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#4F46E5' },
  tabLabel:   { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  tabLabelActive: { color: '#fff' },
  content:    { padding: 20 },
  form:       { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#111827',
  },
  chipRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText:   { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  submitBtn:  { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waterEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  waterTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
  quickRow:   { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickBtn:   { flex: 1, backgroundColor: '#DBEAFE', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  quickText:  { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
})
