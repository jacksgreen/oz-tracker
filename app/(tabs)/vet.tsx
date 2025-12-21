import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';
import { Id } from '../../convex/_generated/dataModel';

// Interval options for recurring events
const INTERVAL_OPTIONS = [
  { label: 'Every week', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Every month', days: 30 },
  { label: 'Every 3 months', days: 90 },
];

export default function VetScreen() {
  const { household } = useAuth();
  const { onAppointmentScheduled, onAppointmentCompleted, onRecurringEventCompleted } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Appointment form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring event form state
  const [recurringTitle, setRecurringTitle] = useState('');
  const [recurringNotes, setRecurringNotes] = useState('');
  const [selectedInterval, setSelectedInterval] = useState(14); // Default to 2 weeks

  // Queries
  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? { householdId: household._id } : 'skip'
  );

  const allAppointments = useQuery(
    api.appointments.getAll,
    household ? { householdId: household._id } : 'skip'
  );

  const repeatingEvents = useQuery(
    api.repeatingEvents.getAll,
    household ? { householdId: household._id } : 'skip'
  );

  // Mutations
  const addAppointment = useMutation(api.appointments.add);
  const markComplete = useMutation(api.appointments.markComplete);
  const removeAppointment = useMutation(api.appointments.remove);

  const addRepeatingEvent = useMutation(api.repeatingEvents.add);
  const markEventDone = useMutation(api.repeatingEvents.markDone);
  const removeRepeatingEvent = useMutation(api.repeatingEvents.remove);

  const pastAppointments = allAppointments?.filter((a) => a.completed);

  // Appointment handlers
  const handleAddAppointment = async () => {
    if (!household || !title.trim()) {
      Alert.alert('Missing Information', 'Please enter an appointment title.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAppointment({
        householdId: household._id,
        title: title.trim(),
        date: selectedDate.getTime(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Send notification for appointment scheduled
      await onAppointmentScheduled(title.trim(), selectedDate);

      resetAppointmentForm();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = (appointmentId: Id<'appointments'>, appointmentTitle: string) => {
    Alert.alert('Complete Appointment', 'Mark this appointment as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          await markComplete({ appointmentId });
          await onAppointmentCompleted(appointmentTitle, appointmentId);
        },
      },
    ]);
  };

  const handleDeleteAppointment = (appointmentId: Id<'appointments'>) => {
    Alert.alert('Delete Appointment', 'Are you sure you want to delete this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeAppointment({ appointmentId }),
      },
    ]);
  };

  // Recurring event handlers
  const handleAddRecurringEvent = async () => {
    if (!household || !recurringTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter an event title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      await addRepeatingEvent({
        householdId: household._id,
        title: recurringTitle.trim(),
        intervalDays: selectedInterval,
        startDate: now.getTime(),
        notes: recurringNotes.trim() || undefined,
      });
      resetRecurringForm();
      setShowAddRecurringModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add recurring event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkEventDone = async (eventId: Id<'repeatingEvents'>, eventTitle: string, intervalDays: number) => {
    await markEventDone({ eventId });
    await onRecurringEventCompleted(eventTitle, intervalDays);
  };

  const handleDeleteRecurringEvent = (eventId: Id<'repeatingEvents'>) => {
    Alert.alert('Delete Recurring Event', 'Are you sure you want to delete this recurring event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeRepeatingEvent({ eventId }),
      },
    ]);
  };

  const resetAppointmentForm = () => {
    setTitle('');
    setLocation('');
    setNotes('');
    setSelectedDate(new Date());
  };

  const resetRecurringForm = () => {
    setRecurringTitle('');
    setRecurringNotes('');
    setSelectedInterval(14);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatShortDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const setQuickDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(10, 0, 0, 0);
    setSelectedDate(date);
  };

  const getDueStatusColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 0) return colors.status.warning;
    if (daysUntilDue <= 3) return colors.primary[500];
    return colors.text.muted;
  };

  const getDueStatusText = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  };

  // Loading states: undefined === loading, null === empty
  const isRecurringLoading = repeatingEvents === undefined;
  const isAppointmentsLoading = upcomingAppointments === undefined;
  const isPastLoading = allAppointments === undefined;

  if (!household) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Recurring Care Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recurring Care</Text>
            <TouchableOpacity
              style={styles.addSmallButton}
              onPress={() => setShowAddRecurringModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.primary[600]} />
            </TouchableOpacity>
          </View>

          {isRecurringLoading ? (
            <View style={styles.sectionLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
            </View>
          ) : !repeatingEvents || repeatingEvents.length === 0 ? (
            <View style={styles.recurringEmptyCard}>
              <View style={styles.recurringEmptyIcon}>
                <Ionicons name="repeat" size={28} color={colors.text.muted} />
              </View>
              <View style={styles.recurringEmptyText}>
                <Text style={styles.recurringEmptyTitle}>No recurring care set up</Text>
                <Text style={styles.recurringEmptySubtext}>
                  Add flea medicine, heartworm pills, and more
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.recurringList}>
              {repeatingEvents.map((event) => {
                const statusColor = getDueStatusColor(event.daysUntilDue);
                const isDueOrOverdue = event.daysUntilDue <= 0;

                return (
                  <View
                    key={event._id}
                    style={[
                      styles.recurringCard,
                      isDueOrOverdue && styles.recurringCardDue,
                    ]}
                  >
                    <View style={styles.recurringCardContent}>
                      <View style={styles.recurringCardHeader}>
                        <View style={[
                          styles.recurringIcon,
                          isDueOrOverdue && styles.recurringIconDue,
                        ]}>
                          <Ionicons
                            name={isDueOrOverdue ? 'alert' : 'repeat'}
                            size={18}
                            color={isDueOrOverdue ? colors.status.warning : colors.primary[600]}
                          />
                        </View>
                        <View style={styles.recurringInfo}>
                          <Text style={styles.recurringTitle}>{event.title}</Text>
                          <Text style={[styles.recurringDue, { color: statusColor }]}>
                            {getDueStatusText(event.daysUntilDue)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.recurringMeta}>
                        <Text style={styles.recurringInterval}>
                          Every {event.intervalDays} days
                        </Text>
                        {event.notes && (
                          <Text style={styles.recurringNotes} numberOfLines={1}>
                            {event.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.recurringActions}>
                      <TouchableOpacity
                        style={[
                          styles.markDoneButton,
                          isDueOrOverdue && styles.markDoneButtonDue,
                        ]}
                        onPress={() => handleMarkEventDone(event._id, event.title, event.intervalDays)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={isDueOrOverdue ? colors.text.inverse : colors.primary[600]}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteRecurringEvent(event._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.text.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vet Visits</Text>

          {isAppointmentsLoading ? (
            <View style={styles.sectionLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
            </View>
          ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <Text style={styles.emptySubtext}>
                {household.dogName} is all caught up!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={colors.primary[600]} />
                <Text style={styles.emptyButtonText}>Schedule Visit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingAppointments.map((appointment, index) => (
              <TouchableOpacity
                key={appointment._id}
                style={[
                  styles.appointmentCard,
                  index === 0 && styles.appointmentCardNext,
                ]}
                onPress={() => handleMarkComplete(appointment._id, appointment.title)}
                onLongPress={() => handleDeleteAppointment(appointment._id)}
                activeOpacity={0.8}
              >
                <View style={styles.appointmentDate}>
                  <Text style={[styles.appointmentDay, index === 0 && styles.appointmentDayNext]}>
                    {new Date(appointment.date).getDate()}
                  </Text>
                  <Text style={styles.appointmentMonth}>
                    {new Date(appointment.date).toLocaleDateString([], { month: 'short' })}
                  </Text>
                </View>

                <View style={styles.appointmentContent}>
                  <Text style={styles.appointmentTitle}>{appointment.title}</Text>
                  <Text style={styles.appointmentTime}>
                    {formatDate(appointment.date)} at {formatTime(appointment.date)}
                  </Text>
                  {appointment.location && (
                    <View style={styles.appointmentLocation}>
                      <Ionicons name="location-outline" size={14} color={colors.text.muted} />
                      <Text style={styles.appointmentLocationText}>{appointment.location}</Text>
                    </View>
                  )}
                  {appointment.notes && (
                    <Text style={styles.appointmentNotes} numberOfLines={2}>
                      {appointment.notes}
                    </Text>
                  )}
                </View>

                <View style={styles.appointmentAction}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.text.muted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Past Appointments Toggle */}
        {isPastLoading ? null : pastAppointments && pastAppointments.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.pastHeader}
              onPress={() => setShowPast(!showPast)}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionTitle}>Past Visits</Text>
              <View style={styles.pastToggle}>
                <Text style={styles.pastCount}>{pastAppointments.length}</Text>
                <Ionicons
                  name={showPast ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.text.secondary}
                />
              </View>
            </TouchableOpacity>

            {showPast && (
              <View style={styles.pastList}>
                {pastAppointments.map((appointment) => (
                  <View key={appointment._id} style={styles.pastCard}>
                    <View style={styles.pastIcon}>
                      <Ionicons name="checkmark" size={16} color={colors.status.success} />
                    </View>
                    <View style={styles.pastContent}>
                      <Text style={styles.pastTitle}>{appointment.title}</Text>
                      <Text style={styles.pastDate}>{formatShortDate(appointment.date)}</Text>
                      {appointment.notes && (
                        <Text style={styles.pastNotes} numberOfLines={1}>
                          {appointment.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Helpful Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary[600]} />
            <Text style={styles.infoTitle}>Tip</Text>
          </View>
          <Text style={styles.infoText}>
            Long press on any appointment to delete it. Tap to mark as completed.
          </Text>
        </View>
      </ScrollView>

      {/* Add Appointment Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Appointment</Text>
            <TouchableOpacity
              onPress={handleAddAppointment}
              disabled={isSubmitting || !title.trim()}
            >
              <Text
                style={[
                  styles.modalSave,
                  (!title.trim() || isSubmitting) && styles.modalSaveDisabled,
                ]}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Appointment Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Annual Checkup"
                placeholderTextColor={colors.text.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>When</Text>
              <View style={styles.quickDates}>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => setQuickDate(0)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => setQuickDate(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDateText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => setQuickDate(7)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDateText}>In 1 Week</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.selectedDateDisplay}>
                <Ionicons name="calendar" size={18} color={colors.primary[600]} />
                <Text style={styles.selectedDateText}>
                  {formatDate(selectedDate.getTime())} at {formatTime(selectedDate.getTime())}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Happy Paws Vet Clinic"
                placeholderTextColor={colors.text.muted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.text.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Recurring Event Modal */}
      <Modal
        visible={showAddRecurringModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddRecurringModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddRecurringModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Recurring Care</Text>
            <TouchableOpacity
              onPress={handleAddRecurringEvent}
              disabled={isSubmitting || !recurringTitle.trim()}
            >
              <Text
                style={[
                  styles.modalSave,
                  (!recurringTitle.trim() || isSubmitting) && styles.modalSaveDisabled,
                ]}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What needs to be done? *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Flea Medicine, Heartworm Pill"
                placeholderTextColor={colors.text.muted}
                value={recurringTitle}
                onChangeText={setRecurringTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>How often?</Text>
              <View style={styles.intervalOptions}>
                {INTERVAL_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.days}
                    style={[
                      styles.intervalOption,
                      selectedInterval === option.days && styles.intervalOptionSelected,
                    ]}
                    onPress={() => setSelectedInterval(option.days)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.intervalOptionText,
                        selectedInterval === option.days && styles.intervalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.text.muted}
                value={recurringNotes}
                onChangeText={setRecurringNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Quick Add Suggestions */}
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Quick Add</Text>
              <View style={styles.suggestions}>
                {[
                  { title: 'Flea Medicine', interval: 30 },
                  { title: 'Heartworm Pill', interval: 30 },
                  { title: 'Nail Trim', interval: 14 },
                  { title: 'Ear Cleaning', interval: 7 },
                ].map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.title}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setRecurringTitle(suggestion.title);
                      setSelectedInterval(suggestion.interval);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{suggestion.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text.secondary,
  },
  sectionLoadingContainer: {
    height: 100,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  addSmallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Recurring Care
  recurringEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  recurringEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recurringEmptyText: {
    flex: 1,
  },
  recurringEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  recurringEmptySubtext: {
    fontSize: 13,
    color: colors.text.muted,
  },
  recurringList: {
    gap: spacing.sm,
  },
  recurringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  recurringCardDue: {
    borderColor: colors.status.warning,
    backgroundColor: colors.status.warningBg,
  },
  recurringCardContent: {
    flex: 1,
  },
  recurringCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recurringIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  recurringIconDue: {
    backgroundColor: colors.status.warningBg,
  },
  recurringInfo: {
    flex: 1,
  },
  recurringTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  recurringDue: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  recurringMeta: {
    marginLeft: 40,
  },
  recurringInterval: {
    fontSize: 12,
    color: colors.text.muted,
  },
  recurringNotes: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  recurringActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markDoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  markDoneButtonDue: {
    backgroundColor: colors.status.warning,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  appointmentCardNext: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  appointmentDate: {
    width: 48,
    alignItems: 'center',
    marginRight: spacing.md,
    paddingTop: 2,
  },
  appointmentDay: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  appointmentDayNext: {
    color: colors.primary[600],
  },
  appointmentMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  appointmentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  appointmentLocationText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  appointmentNotes: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  appointmentAction: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },

  // Past Appointments
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pastCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pastList: {
    marginTop: spacing.md,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.status.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  pastContent: {
    flex: 1,
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  pastDate: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  pastNotes: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  modalSaveDisabled: {
    color: colors.text.muted,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // Form
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  quickDates: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary[700],
  },

  // Interval Options
  intervalOptions: {
    gap: spacing.sm,
  },
  intervalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  intervalOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  intervalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  intervalOptionTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },

  // Suggestions
  suggestionsSection: {
    marginTop: spacing.md,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent.light,
    borderRadius: borderRadius.full,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent.warm,
  },
});
