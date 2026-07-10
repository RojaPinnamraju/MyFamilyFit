import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { Link, router } from 'expo-router'
import { authApi } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/authStore'

export default function RegisterScreen() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge]           = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth } = useAuthStore()

  const handleRegister = async () => {
    if (!name || !email || !password) { Alert.alert('Please fill in all fields'); return }
    if (password.length < 8) { Alert.alert('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { access_token } = await authApi.register({
        name, email, password,
        age: age ? parseInt(age) : undefined,
      })
      const user = await authApi.getMe(access_token)
      await setAuth(user, access_token)
      router.replace('/(tabs)/dashboard')
    } catch (e: any) {
      Alert.alert('Registration failed', e.response?.data?.detail ?? 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>💪 FamilyFit</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9CA3AF"
          value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#9CA3AF"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password (min 8 chars)" placeholderTextColor="#9CA3AF"
          secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Age (optional)" placeholderTextColor="#9CA3AF"
          keyboardType="number-pad" value={age} onChangeText={setAge} />

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
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
