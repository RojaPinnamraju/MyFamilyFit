import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { familyApi } from '../../src/api/family'
import { Family, FamilyMember } from '../../src/types'

export default function FamilyScreen() {
  const insets  = useSafeAreaInsets()
  const [family,  setFamily]  = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [name,    setName]    = useState('')
  const [creating,setCreating]= useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const fam = await familyApi.getMyFamily()
      setFamily(fam)
      const m = await familyApi.getMembers(fam.id)
      setMembers(m)
    } catch {
      setFamily(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Enter a family name'); return }
    setCreating(true)
    try {
      await familyApi.createFamily(name.trim())
      await load()
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.detail ?? 'Could not create family')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  if (!family) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Family</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.emptyTitle}>Create your family</Text>
          <Text style={styles.emptySub}>Start tracking fitness together</Text>
          <TextInput
            style={styles.input}
            placeholder="Family name (e.g. The Smiths)"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
          <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={creating}>
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Family</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.familyName}>{family.name}</Text>
        <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.membersCard}>
          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: m.user.avatar_color ?? '#4F46E5' }]}>
                <Text style={styles.avatarText}>{m.user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.user.name}</Text>
                <Text style={styles.memberEmail}>{m.user.email}</Text>
              </View>
              {m.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminText}>Admin</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F9FAFB' },
  title:        { fontSize: 22, fontWeight: '800', color: '#111827', padding: 20 },
  header:       { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingBottom: 24 },
  familyName:   { fontSize: 24, fontWeight: '800', color: '#fff' },
  memberCount:  { fontSize: 14, color: '#C7D2FE', marginTop: 2 },
  body:         { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  membersCard:  {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  memberRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 18 },
  memberName:   { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberEmail:  { fontSize: 12, color: '#9CA3AF' },
  adminBadge:   { backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  adminText:    { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  emptyCard:    { margin: 24, backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyEmoji:   { fontSize: 52, marginBottom: 12 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub:     { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  input:        {
    width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15,
    color: '#111827', marginBottom: 12,
  },
  btn:          { width: '100%', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
})
