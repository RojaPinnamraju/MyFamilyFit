import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { apiClient } from '../api/client'

// How foreground notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
})

// ── Permission + token registration ──────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data

    // Store token on the backend
    await apiClient.patch('/users/me/push-token', { push_token: token }).catch(() => {})

    return token
  } catch (e) {
    console.log('Failed to get push token:', e)
    return null
  }
}

// ── Schedule local reminders ──────────────────────────────────────────────────
export async function scheduleWaterReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync()

  // Every 2 hours from 8am to 8pm
  const hours = [8, 10, 12, 14, 16, 18, 20]
  for (const hour of hours) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Time to hydrate!',
        body: "Don't forget to drink some water.",
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    })
  }
}

export async function scheduleWorkoutReminder(hour = 7, minute = 0) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏋️ Workout time!',
      body: "You've got a workout scheduled. Let's go!",
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  })
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
