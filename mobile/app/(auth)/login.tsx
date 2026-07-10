import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { Link, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { authApi } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/authStore'
import { API_BASE } from '../../src/api/client'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth } = useAuthStore()

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Please fill in all fields'); return }
    setLoading(true)
    try {
      const { access_token } = await authApi.login({ email, password })
      const user = await authApi.getMe(access_token)
      await setAuth(user, access_token)
      router.replace('/(tabs)/dashboard')
    } catch (e: any) {
      Alert.alert('Login failed', e.response?.data?.detail ?? 'Check your credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${API_BASE}/auth/google`,
      'familyfit://callback'
    )
    if (result.type === 'success' && result.url) {
      const url = new URL(result.url)
      const token = url.searchParams.get('token')
      if (token) {
        try {
          const user = await authApi.getMe(token)
          await setAuth(user, token)
          router.replace('/(tabs)/dashboard')
        } catch {
          Alert.alert('Google sign-in failed')
        }
      }
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💪 FamilyFit</Text>
          <Text style={styles.subtitle}>Track fitness together</Text>
        </View>

        {/* Google Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F9FAFB', padding: 24, justifyContent: 'center' },
  header:    { alignItems: 'center', marginBottom: 40 },
  logo:      { fontSize: 32, fontWeight: '800', color: '#4F46E5' },
  subtitle:  { fontSize: 16, color: '#6B7280', marginTop: 4 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24,
    gap: 10, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  googleG:    { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  divider:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#111827', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:     { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#6B7280', fontSize: 14 },
  linkBold: { color: '#4F46E5', fontWeight: '700' },
})
