import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (!user) return null

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Avatar section */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 24 }]}>
        <View style={[styles.avatar, { backgroundColor: user.avatar_color ?? '#4F46E5' }]}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.auth_provider === 'google' && (
          <View style={styles.googleBadge}>
            <Text style={styles.googleBadgeText}>G  Google Account</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Stats */}
        <Text style={styles.sectionTitle}>Body Stats</Text>
        <View style={styles.statsCard}>
          <StatRow label="Age" value={user.age ? `${user.age} yrs` : '—'} />
          <StatRow label="Height" value={user.height_cm ? `${user.height_cm} cm` : '—'} />
          <StatRow label="Current Weight" value={user.current_weight_kg ? `${user.current_weight_kg} kg` : '—'} />
          <StatRow label="Target Weight" value={user.target_weight_kg ? `${user.target_weight_kg} kg` : '—'} />
          <StatRow label="Goal" value={user.goal_type?.replace('_', ' ') ?? '—'} last />
        </View>

        {/* Goals */}
        <Text style={styles.sectionTitle}>Daily Goals</Text>
        <View style={styles.statsCard}>
          <StatRow label="Calories" value={user.daily_calorie_goal ? `${user.daily_calorie_goal} kcal` : '2,000 kcal'} />
          <StatRow label="Water" value={user.daily_water_goal_ml ? `${user.daily_water_goal_ml / 1000}L` : '2.0L'} last />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.statRow, !last && styles.statRowBorder]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F9FAFB' },
  headerBg:     { backgroundColor: '#4F46E5', alignItems: 'center', paddingBottom: 32, paddingHorizontal: 20 },
  avatar:       { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:   { color: '#fff', fontWeight: '800', fontSize: 32 },
  name:         { fontSize: 22, fontWeight: '800', color: '#fff' },
  email:        { fontSize: 14, color: '#C7D2FE', marginTop: 2 },
  googleBadge:  { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  googleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  body:         { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 20 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  statRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  statRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statLabel:    { fontSize: 14, color: '#6B7280' },
  statValue:    { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  logoutBtn:    { marginTop: 32, backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  logoutText:   { color: '#DC2626', fontSize: 16, fontWeight: '700' },
})
