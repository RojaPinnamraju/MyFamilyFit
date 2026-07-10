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

// ── Medication reminders ──────────────────────────────────────────────────────
export interface MedScheduleItem {
  id: number
  name: string
  dosage?: string
  reminder_times: string[]   // ["08:00", "20:00"]
  food_timing?: string
}

const MED_REMINDER_TAG = 'med_reminder'

/** Cancel all previously scheduled med reminders and reschedule from scratch. */
export async function scheduleMedReminders(meds: MedScheduleItem[]): Promise<void> {
  // Cancel existing med notifications (by tag prefix)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  for (const notif of scheduled) {
    if ((notif.content.data as any)?.tag === MED_REMINDER_TAG) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier)
    }
  }

  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  for (const med of meds) {
    for (const timeStr of med.reminder_times) {
      const [hourStr, minuteStr] = timeStr.split(':')
      const hour   = parseInt(hourStr,   10)
      const minute = parseInt(minuteStr, 10)

      if (isNaN(hour) || isNaN(minute)) continue

      const foodHint: Record<string, string> = {
        before: 'Before food',
        after:  'After food',
        with:   'With food',
      }
      const bodyParts = [med.dosage, foodHint[med.food_timing ?? '']].filter(Boolean)

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${med.name}`,
          body:  bodyParts.join(' · ') || 'Time for your medication',
          sound: true,
          data:  { tag: MED_REMINDER_TAG, medication_id: med.id, reminder_time: timeStr },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        } as Notifications.DailyTriggerInput,
      })
    }
  }
}

/** Send an immediate local notification (for testing). */
export async function sendImmediateMedReminder(name: string, dosage?: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 ${name} (test)`,
      body:  dosage || 'Test reminder',
      sound: true,
    },
    trigger: null,   // fire immediately
  })
}
