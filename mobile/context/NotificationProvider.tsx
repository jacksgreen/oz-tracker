import React, { createContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useCurrentUser } from './AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  requestNotificationPermissions,
  registerForPushNotifications,
  scheduleAllAppointmentReminders,
  scheduleAllRecurringEventReminders,
  cleanupExpiredReminders,
} from '../lib/notifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, household } = useCurrentUser();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const savePushToken = useMutation(api.users.savePushToken);

  // Fetch data for scheduling reminders
  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? {} : 'skip'
  );

  const repeatingEvents = useQuery(
    api.repeatingEvents.getAll,
    household ? {} : 'skip'
  );

  // Initialize notifications on mount
  useEffect(() => {
    const setup = async () => {
      await requestNotificationPermissions();
      await cleanupExpiredReminders();
    };

    setup();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Register push token when user is available
  useEffect(() => {
    if (!user) return;

    const register = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken({ expoPushToken: token });
      }
    };

    register();
  }, [user?._id]);

  // Schedule appointment reminders when data changes
  useEffect(() => {
    if (household && upcomingAppointments) {
      scheduleAllAppointmentReminders(
        household.dogName,
        upcomingAppointments.map(a => ({
          _id: a._id,
          title: a.title,
          date: a.date,
          location: a.location,
          completed: a.completed,
        }))
      );
    }
  }, [household, upcomingAppointments]);

  // Schedule recurring event reminders when data changes
  useEffect(() => {
    if (household && repeatingEvents) {
      scheduleAllRecurringEventReminders(
        household.dogName,
        repeatingEvents.map(e => ({
          _id: e._id,
          title: e.title,
          daysUntilDue: e.daysUntilDue,
          intervalDays: e.intervalDays,
          lastCompletedDate: e.lastCompletedDate,
        }))
      );
    }
  }, [household, repeatingEvents]);

  return (
    <NotificationContext.Provider value={null}>
      {children}
    </NotificationContext.Provider>
  );
}
