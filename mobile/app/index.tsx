import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { token, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return <Redirect href={token ? '/(tabs)/dashboard' : '/(auth)/login'} />
}
