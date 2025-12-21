import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_PERMISSION_KEY = '@oz_tracker_notification_permission';
const SCHEDULED_REMINDERS_KEY = '@oz_tracker_scheduled_reminders';

// Types for scheduled reminders tracking
interface ScheduledReminder {
  id: string;
  type: 'appointment' | 'repeatingEvent';
  itemId: string;
  scheduledFor: number;
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, status);

  return status === 'granted';
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ============================================
// ACTION NOTIFICATIONS (immediate feedback)
// ============================================

// Show notification when a care shift is completed
export async function notifyShiftCompleted(
  dogName: string,
  shiftType: 'am' | 'pm',
  completedByName: string
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  const shiftLabel = shiftType === 'am' ? 'Morning' : 'Evening';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${shiftLabel} shift done!`,
      body: `${completedByName} completed ${dogName}'s ${shiftLabel.toLowerCase()} walk and meal.`,
      data: { type: 'shift_completed', shiftType },
    },
    trigger: null, // Show immediately
  });
}

// Show notification when a shift is scheduled/assigned
export async function notifyShiftScheduled(
  dogName: string,
  shiftType: 'am' | 'pm',
  assignedToName: string,
  date: Date
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  const shiftLabel = shiftType === 'am' ? 'Morning' : 'Evening';
  const dateStr = formatDateForNotification(date);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Shift Assigned',
      body: `${assignedToName} will handle ${dogName}'s ${shiftLabel.toLowerCase()} shift on ${dateStr}.`,
      data: { type: 'shift_scheduled', shiftType },
    },
    trigger: null,
  });
}

// Show notification when an appointment is scheduled
export async function notifyAppointmentScheduled(
  dogName: string,
  appointmentTitle: string,
  date: Date
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  const dateStr = formatDateForNotification(date);
  const timeStr = formatTimeForNotification(date);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appointment Scheduled',
      body: `${appointmentTitle} for ${dogName} on ${dateStr} at ${timeStr}.`,
      data: { type: 'appointment_scheduled' },
    },
    trigger: null,
  });
}

// Show notification when an appointment is completed
export async function notifyAppointmentCompleted(
  dogName: string,
  appointmentTitle: string
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appointment Complete',
      body: `${appointmentTitle} for ${dogName} has been completed.`,
      data: { type: 'appointment_completed' },
    },
    trigger: null,
  });
}

// Show notification when recurring care is marked done
export async function notifyRecurringEventCompleted(
  dogName: string,
  eventTitle: string,
  nextDueDate: Date
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  const nextDateStr = formatDateForNotification(nextDueDate);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${eventTitle} Done!`,
      body: `${dogName}'s ${eventTitle.toLowerCase()} is complete. Next due: ${nextDateStr}.`,
      data: { type: 'recurring_completed' },
    },
    trigger: null,
  });
}

// ============================================
// SCHEDULED REMINDER NOTIFICATIONS
// ============================================

// Schedule a reminder for an upcoming appointment (morning of the day)
export async function scheduleAppointmentReminder(
  appointmentId: string,
  dogName: string,
  appointmentTitle: string,
  appointmentDate: Date,
  location?: string
): Promise<string | null> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return null;

  // Schedule for 8 AM on the day of the appointment
  const reminderDate = new Date(appointmentDate);
  reminderDate.setHours(8, 0, 0, 0);

  // Don't schedule if the reminder time has already passed
  if (reminderDate.getTime() <= Date.now()) return null;

  const locationText = location ? ` at ${location}` : '';
  const timeStr = formatTimeForNotification(appointmentDate);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Vet Appointment Today`,
      body: `${dogName} has ${appointmentTitle}${locationText} at ${timeStr}.`,
      data: { type: 'appointment_reminder', appointmentId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  // Track scheduled reminder
  await trackScheduledReminder({
    id: notificationId,
    type: 'appointment',
    itemId: appointmentId,
    scheduledFor: reminderDate.getTime(),
  });

  return notificationId;
}

// Schedule a reminder for a recurring event that's due
export async function scheduleRecurringEventReminder(
  eventId: string,
  dogName: string,
  eventTitle: string,
  dueDate: Date
): Promise<string | null> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return null;

  // Schedule for 9 AM on the due date
  const reminderDate = new Date(dueDate);
  reminderDate.setHours(9, 0, 0, 0);

  // Don't schedule if the reminder time has already passed
  if (reminderDate.getTime() <= Date.now()) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${eventTitle} Due Today`,
      body: `Time for ${dogName}'s ${eventTitle.toLowerCase()}!`,
      data: { type: 'recurring_reminder', eventId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  // Track scheduled reminder
  await trackScheduledReminder({
    id: notificationId,
    type: 'repeatingEvent',
    itemId: eventId,
    scheduledFor: reminderDate.getTime(),
  });

  return notificationId;
}

// Cancel a scheduled reminder
export async function cancelScheduledReminder(itemId: string, type: 'appointment' | 'repeatingEvent'): Promise<void> {
  const reminders = await getScheduledReminders();
  const reminder = reminders.find(r => r.itemId === itemId && r.type === type);

  if (reminder) {
    await Notifications.cancelScheduledNotificationAsync(reminder.id);
    await removeScheduledReminder(reminder.id);
  }
}

// Cancel all scheduled reminders for an item
export async function cancelAllRemindersForItem(itemId: string): Promise<void> {
  const reminders = await getScheduledReminders();
  const itemReminders = reminders.filter(r => r.itemId === itemId);

  for (const reminder of itemReminders) {
    await Notifications.cancelScheduledNotificationAsync(reminder.id);
    await removeScheduledReminder(reminder.id);
  }
}

// ============================================
// BULK REMINDER SCHEDULING
// ============================================

interface AppointmentData {
  _id: string;
  title: string;
  date: number;
  location?: string;
  completed: boolean;
}

interface RepeatingEventData {
  _id: string;
  title: string;
  daysUntilDue: number;
  intervalDays: number;
  lastCompletedDate?: number;
}

// Schedule reminders for all upcoming appointments
export async function scheduleAllAppointmentReminders(
  dogName: string,
  appointments: AppointmentData[]
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  // Get currently scheduled reminders
  const existingReminders = await getScheduledReminders();
  const existingAppointmentIds = new Set(
    existingReminders.filter(r => r.type === 'appointment').map(r => r.itemId)
  );

  for (const appointment of appointments) {
    // Skip completed appointments
    if (appointment.completed) continue;

    // Skip if already scheduled
    if (existingAppointmentIds.has(appointment._id)) continue;

    await scheduleAppointmentReminder(
      appointment._id,
      dogName,
      appointment.title,
      new Date(appointment.date),
      appointment.location
    );
  }
}

// Schedule reminders for all recurring events that will be due soon
export async function scheduleAllRecurringEventReminders(
  dogName: string,
  events: RepeatingEventData[]
): Promise<void> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return;

  // Get currently scheduled reminders
  const existingReminders = await getScheduledReminders();
  const existingEventIds = new Set(
    existingReminders.filter(r => r.type === 'repeatingEvent').map(r => r.itemId)
  );

  for (const event of events) {
    // Only schedule for events due in the next 7 days
    if (event.daysUntilDue > 7) continue;

    // Skip if already scheduled
    if (existingEventIds.has(event._id)) continue;

    // Calculate the due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + event.daysUntilDue);
    dueDate.setHours(0, 0, 0, 0);

    await scheduleRecurringEventReminder(
      event._id,
      dogName,
      event.title,
      dueDate
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDateForNotification(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateNormalized = new Date(date);
  dateNormalized.setHours(0, 0, 0, 0);

  if (dateNormalized.getTime() === today.getTime()) {
    return 'today';
  }
  if (dateNormalized.getTime() === tomorrow.getTime()) {
    return 'tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeForNotification(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Track scheduled reminders in AsyncStorage
async function trackScheduledReminder(reminder: ScheduledReminder): Promise<void> {
  const reminders = await getScheduledReminders();
  reminders.push(reminder);
  await AsyncStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(reminders));
}

async function getScheduledReminders(): Promise<ScheduledReminder[]> {
  const data = await AsyncStorage.getItem(SCHEDULED_REMINDERS_KEY);
  if (!data) return [];

  try {
    const reminders: ScheduledReminder[] = JSON.parse(data);
    // Clean up old reminders (already triggered)
    const now = Date.now();
    return reminders.filter(r => r.scheduledFor > now);
  } catch {
    return [];
  }
}

async function removeScheduledReminder(notificationId: string): Promise<void> {
  const reminders = await getScheduledReminders();
  const filtered = reminders.filter(r => r.id !== notificationId);
  await AsyncStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(filtered));
}

// Clean up expired reminders (call periodically)
export async function cleanupExpiredReminders(): Promise<void> {
  const reminders = await getScheduledReminders();
  const now = Date.now();
  const valid = reminders.filter(r => r.scheduledFor > now);
  await AsyncStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(valid));
}

// Get push token for potential future use with push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // For local notifications, we don't need a push token
  // But this can be extended for push notifications later
  return null;
}
