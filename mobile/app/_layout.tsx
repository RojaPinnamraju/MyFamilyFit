import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
    // Defer push notification setup so native bridge is ready
    const timer = setTimeout(() => {
      import('../src/utils/notifications').then(({ registerForPushNotificationsAsync }) => {
        registerForPushNotificationsAsync()
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
