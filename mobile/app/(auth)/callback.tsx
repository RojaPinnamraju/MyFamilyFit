import { useEffect } from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { authApi } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/authStore'

// Handles the deep-link redirect from Google OAuth:
//   familyfit://callback?token=<jwt>
export default function CallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const handle = async () => {
      if (params.error) {
        router.replace('/(auth)/login')
        return
      }
      if (params.token) {
        try {
          const user = await authApi.getMe(params.token)
          await setAuth(user, params.token)
          router.replace('/(tabs)/dashboard')
        } catch {
          router.replace('/(auth)/login')
        }
      }
    }
    handle()
  }, [params.token])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text:      { marginTop: 16, fontSize: 16, color: '#6B7280' },
})
