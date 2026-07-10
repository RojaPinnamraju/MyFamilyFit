import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { familyApi } from '../../src/api/family'
import { workoutApi, mealApi, waterApi } from '../../src/api/tracking'
import { Family, FamilyMember } from '../../src/types'

interface Stats {
  calories: number
  waterMl: number
  workouts: number
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuthStore((s) => s.user)

  const [family,    setFamily]    = useState<Family | null>(null)
  const [members,   setMembers]   = useState<FamilyMember[]>([])
  const [stats,     setStats]     = useState<Stats>({ calories: 0, waterMl: 0, workouts: 0 })
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async () => {
    try {
      const [fam, cal, water, workouts] = await Promise.all([
        familyApi.getMyFamily().catch(() => null),
        mealApi.todayCalories(),
        waterApi.todayMl(),
        workoutApi.todayCount(),
      ])
      setFamily(fam)
      if (fam) {
        const m = await familyApi.getMembers(fam.id).catch(() => [])
        setMembers(m)
      }
      setStats({ calories: cal, waterMl: water, workouts })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const waterPercent = Math.min(
    100,
    Math.round((stats.waterMl / (user?.daily_water_goal_ml ?? 2000)) * 100)
  )
  const caloriePercent = Math.min(
    100,
    Math.round((stats.calories / (user?.daily_calorie_goal ?? 2000)) * 100)
  )

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      {/* Top header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>Good {greeting()}, {user?.name?.split(' ')[0]} 👋</Text>
        {family && <Text style={styles.familyName}>{family.name}</Text>}
      </View>

      <View style={styles.body}>
        {/* Today's stats */}
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.statsRow}>
          <StatCard emoji="🔥" label="Calories" value={`${stats.calories}`} sub="kcal" color="#EF4444" percent={caloriePercent} />
          <StatCard emoji="💧" label="Water"    value={`${(stats.waterMl / 1000).toFixed(1)}`} sub="L" color="#3B82F6" percent={waterPercent} />
          <StatCard emoji="🏋️" label="Workouts" value={`${stats.workouts}`} sub="today" color="#10B981" percent={null} />
        </View>

        {/* Family members */}
        {members.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <View style={styles.membersCard}>
              {members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: m.user.avatar_color ?? '#4F46E5' }]}>
                    <Text style={styles.avatarText}>
                      {m.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>{m.user.name}</Text>
                    <Text style={styles.memberRole}>{m.role}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {!family && (
          <View style={styles.noFamilyCard}>
            <Text style={styles.noFamilyEmoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.noFamilyTitle}>No family yet</Text>
            <Text style={styles.noFamilyText}>Go to the Family tab to create or join one</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ emoji, label, value, sub, color, percent }: {
  emoji: string; label: string; value: string; sub: string
  color: string; percent: number | null
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {percent !== null && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: color }]} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F9FAFB' },
  headerBg:     { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingBottom: 28 },
  greeting:     { fontSize: 22, fontWeight: '700', color: '#fff' },
  familyName:   { fontSize: 14, color: '#C7D2FE', marginTop: 2 },
  body:         { padding: 20, marginTop: -12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 20 },
  statsRow:     { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statEmoji:   { fontSize: 22, marginBottom: 4 },
  statValue:   { fontSize: 20, fontWeight: '800', color: '#111827' },
  statSub:     { fontSize: 11, color: '#6B7280' },
  statLabel:   { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },
  progressBg:  { width: '100%', height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 8 },
  progressFill:{ height: 4, borderRadius: 2 },
  membersCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    gap: 12,
  },
  memberRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberName:  { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberRole:  { fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' },
  noFamilyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center',
    marginTop: 20,
  },
  noFamilyEmoji: { fontSize: 48, marginBottom: 12 },
  noFamilyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  noFamilyText:  { fontSize: 14, color: '#6B7280', textAlign: 'center' },
})
