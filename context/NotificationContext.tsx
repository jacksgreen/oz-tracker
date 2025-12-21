import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  requestNotificationPermissions,
  scheduleAllAppointmentReminders,
  scheduleAllRecurringEventReminders,
  cleanupExpiredReminders,
  notifyShiftCompleted,
  notifyShiftScheduled,
  notifyAppointmentScheduled,
  notifyAppointmentCompleted,
  notifyRecurringEventCompleted,
  cancelAllRemindersForItem,
} from '../lib/notifications';

interface NotificationContextType {
  // Action notifications
  onShiftCompleted: (shiftType: 'am' | 'pm', completedByName: string) => Promise<void>;
  onShiftScheduled: (shiftType: 'am' | 'pm', assignedToName: string, date: Date) => Promise<void>;
  onAppointmentScheduled: (title: string, date: Date) => Promise<void>;
  onAppointmentCompleted: (title: string, appointmentId: string) => Promise<void>;
  onRecurringEventCompleted: (title: string, intervalDays: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { household } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Fetch data for scheduling reminders
  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? { householdId: household._id } : 'skip'
  );

  const repeatingEvents = useQuery(
    api.repeatingEvents.getAll,
    household ? { householdId: household._id } : 'skip'
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
      // Handle notification received while app is in foreground
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tapped
      console.log('Notification response:', response);
      // Could navigate to relevant screen based on notification data
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

  // Action notification handlers
  const onShiftCompleted = useCallback(async (shiftType: 'am' | 'pm', completedByName: string) => {
    if (!household) return;
    await notifyShiftCompleted(household.dogName, shiftType, completedByName);
  }, [household]);

  const onShiftScheduled = useCallback(async (shiftType: 'am' | 'pm', assignedToName: string, date: Date) => {
    if (!household) return;
    await notifyShiftScheduled(household.dogName, shiftType, assignedToName, date);
  }, [household]);

  const onAppointmentScheduled = useCallback(async (title: string, date: Date) => {
    if (!household) return;
    await notifyAppointmentScheduled(household.dogName, title, date);
  }, [household]);

  const onAppointmentCompleted = useCallback(async (title: string, appointmentId: string) => {
    if (!household) return;
    await notifyAppointmentCompleted(household.dogName, title);
    // Cancel the reminder for this appointment since it's completed
    await cancelAllRemindersForItem(appointmentId);
  }, [household]);

  const onRecurringEventCompleted = useCallback(async (title: string, intervalDays: number) => {
    if (!household) return;
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
    await notifyRecurringEventCompleted(household.dogName, title, nextDueDate);
  }, [household]);

  const value: NotificationContextType = {
    onShiftCompleted,
    onShiftScheduled,
    onAppointmentScheduled,
    onAppointmentCompleted,
    onRecurringEventCompleted,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
