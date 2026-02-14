import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { colors, spacing, borderRadius, typography, fonts, hairline } from '../../lib/theme';
import { formatDate, formatTime } from '../../lib/utils';
import { Id } from '../../convex/_generated/dataModel';

// Interval options for recurring events
const INTERVAL_OPTIONS = [
  { label: 'Every week', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Every month', days: 30 },
  { label: 'Every 3 months', days: 90 },
];

export default function VetScreen() {
  const { user, household } = useCurrentUser();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Appointment form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Edit appointment state
  const [editingAppointment, setEditingAppointment] = useState<{
    _id: Id<'appointments'>;
    title: string;
    date: number;
    location?: string;
    notes?: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  // Recurring event form state
  const [recurringTitle, setRecurringTitle] = useState('');
  const [recurringNotes, setRecurringNotes] = useState('');
  const [selectedInterval, setSelectedInterval] = useState(14); // Default to 2 weeks

  // Queries
  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? {} : 'skip'
  );

  const allAppointments = useQuery(
    api.appointments.getAll,
    household ? {} : 'skip'
  );

  const repeatingEvents = useQuery(
    api.repeatingEvents.getAll,
    household ? {} : 'skip'
  );

  // Mutations
  const addAppointment = useMutation(api.appointments.add);
  const markComplete = useMutation(api.appointments.markComplete);
  const removeAppointment = useMutation(api.appointments.remove);
  const updateAppointment = useMutation(api.appointments.update);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addAppointment({
        title: title.trim(),
        date: selectedDate.getTime(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await markComplete({ appointmentId });
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
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          removeAppointment({ appointmentId });
        },
      },
    ]);
  };

  const handleEditAppointment = (appointment: {
    _id: Id<'appointments'>;
    title: string;
    date: number;
    location?: string;
    notes?: string;
  }) => {
    setEditingAppointment(appointment);
    setEditTitle(appointment.title);
    setEditDate(new Date(appointment.date));
    setEditLocation(appointment.location || '');
    setEditNotes(appointment.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment || !editTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter an appointment title.');
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateAppointment({
        appointmentId: editingAppointment._id,
        title: editTitle.trim(),
        date: editDate.getTime(),
        location: editLocation.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
      setEditingAppointment(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addRepeatingEvent({
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

  const handleMarkEventDone = async (eventId: Id<'repeatingEvents'>) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markEventDone({ eventId });
  };

  const handleDeleteRecurringEvent = (eventId: Id<'repeatingEvents'>) => {
    Alert.alert('Delete Recurring Event', 'Are you sure you want to delete this recurring event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          removeRepeatingEvent({ eventId });
        },
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

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const updated = new Date(selectedDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(updated);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      const updated = new Date(selectedDate);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setSelectedDate(updated);
    }
  };

  const onEditDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (date) {
      const updated = new Date(editDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setEditDate(updated);
    }
  };

  const onEditTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowEditTimePicker(false);
    if (date) {
      const updated = new Date(editDate);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setEditDate(updated);
    }
  };

  const getDueStatusColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 0) return colors.status.warning;
    if (daysUntilDue <= 3) return colors.accent.warm;
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
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  const renderDateTimePickers = (
    date: Date,
    showDate: boolean,
    showTime: boolean,
    setShowDate: (v: boolean) => void,
    setShowTime: (v: boolean) => void,
    handleDateChange: (event: DateTimePickerEvent, date?: Date) => void,
    handleTimeChange: (event: DateTimePickerEvent, date?: Date) => void,
  ) => (
    <>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowDate(!showDate)}
          accessibilityLabel={`Pick date, currently ${formatDate(date.getTime())}`}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.dateTimeButtonText}>{formatDate(date.getTime())}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowTime(!showTime)}
          accessibilityLabel={`Pick time, currently ${formatTime(date.getTime())}`}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.dateTimeButtonText}>{formatTime(date.getTime())}</Text>
        </TouchableOpacity>
      </View>
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
          accentColor={colors.accent.warm}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          accentColor={colors.accent.warm}
        />
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Add new appointment"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Recurring Care Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">RECURRING CARE</Text>
            <TouchableOpacity
              style={styles.addSmallButton}
              onPress={() => setShowAddRecurringModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Add recurring care item"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={16} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {isRecurringLoading ? (
            <View style={styles.sectionLoadingContainer}>
              <ActivityIndicator size="small" color={colors.text.muted} />
            </View>
          ) : !repeatingEvents || repeatingEvents.length === 0 ? (
            <View style={styles.recurringEmptyCard}>
              <Ionicons name="repeat" size={20} color={colors.text.muted} />
              <View style={styles.recurringEmptyText}>
                <Text style={styles.recurringEmptyTitle}>No recurring care set up</Text>
                <Text style={styles.recurringEmptySubtext}>
                  Add flea medicine, heartworm pills, and more
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.recurringList}>
              {repeatingEvents.map((event, index) => {
                const statusColor = getDueStatusColor(event.daysUntilDue);
                const isDueOrOverdue = event.daysUntilDue <= 0;

                return (
                  <View
                    key={event._id}
                    style={[
                      styles.recurringRow,
                      index < repeatingEvents.length - 1 && styles.recurringRowBorder,
                    ]}
                    accessibilityLabel={`${event.title}, ${getDueStatusText(event.daysUntilDue)}, every ${event.intervalDays} days`}
                  >
                    <View style={styles.recurringContent}>
                      <Text style={styles.recurringTitle}>{event.title}</Text>
                      <Text style={[styles.recurringDue, { color: statusColor }]}>
                        {getDueStatusText(event.daysUntilDue)}
                      </Text>
                      <Text style={styles.recurringInterval}>
                        Every {event.intervalDays} days
                      </Text>
                    </View>
                    <View style={styles.recurringActions}>
                      <TouchableOpacity
                        style={[
                          styles.markDoneButton,
                          isDueOrOverdue && styles.markDoneButtonDue,
                        ]}
                        onPress={() => handleMarkEventDone(event._id)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Mark ${event.title} as done`}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={isDueOrOverdue ? colors.text.inverse : colors.text.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteRecurringEvent(event._id)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Delete ${event.title}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.text.muted} />
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
          <Text style={styles.sectionTitleStandalone} accessibilityRole="header">VET VISITS</Text>

          {isAppointmentsLoading ? (
            <View style={styles.sectionLoadingContainer}>
              <ActivityIndicator size="small" color={colors.text.muted} />
            </View>
          ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color={colors.text.muted} />
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <Text style={styles.emptySubtext}>
                {household.dogName} is all caught up
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
                accessibilityLabel="Schedule a vet visit"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>SCHEDULE VISIT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingAppointments.map((appointment, index) => (
              <View
                key={appointment._id}
                style={[
                  styles.appointmentCard,
                  index === 0 && styles.appointmentCardNext,
                ]}
                accessibilityLabel={`${appointment.title}, ${formatDate(appointment.date)} at ${formatTime(appointment.date)}${appointment.location ? `, at ${appointment.location}` : ''}`}
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
                      <Ionicons name="location-outline" size={13} color={colors.text.muted} />
                      <Text style={styles.appointmentLocationText}>{appointment.location}</Text>
                    </View>
                  )}
                  {appointment.notes && (
                    <Text style={styles.appointmentNotes} numberOfLines={2}>
                      {appointment.notes}
                    </Text>
                  )}
                </View>

                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    onPress={() => handleEditAppointment(appointment)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Edit ${appointment.title}`}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.text.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMarkComplete(appointment._id, appointment.title)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Mark ${appointment.title} as complete`}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color={colors.text.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteAppointment(appointment._id)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Delete ${appointment.title}`}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>
              </View>
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
              accessibilityLabel={`Past visits, ${pastAppointments.length} total, tap to ${showPast ? 'hide' : 'show'}`}
              accessibilityRole="button"
            >
              <Text style={styles.sectionTitleStandalone} accessibilityRole="header">PAST VISITS</Text>
              <View style={styles.pastToggle}>
                <Text style={styles.pastCount}>{pastAppointments.length}</Text>
                <Ionicons
                  name={showPast ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.text.secondary}
                />
              </View>
            </TouchableOpacity>

            {showPast && (
              <View style={styles.pastList}>
                {pastAppointments.map((appointment) => (
                  <View key={appointment._id} style={styles.pastRow}>
                    <Ionicons name="checkmark" size={16} color={colors.status.success} />
                    <View style={styles.pastContent}>
                      <Text style={styles.pastTitle}>{appointment.title}</Text>
                      <Text style={styles.pastDate}>{formatShortDate(appointment.date)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
              <Text style={styles.inputLabel}>APPOINTMENT TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Annual Checkup"
                placeholderTextColor={colors.text.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHEN</Text>
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

              {renderDateTimePickers(
                selectedDate,
                showDatePicker,
                showTimePicker,
                setShowDatePicker,
                setShowTimePicker,
                onDateChange,
                onTimeChange,
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LOCATION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Happy Paws Vet Clinic"
                placeholderTextColor={colors.text.muted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
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

      {/* Edit Appointment Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Appointment</Text>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={isSubmitting || !editTitle.trim()}
            >
              <Text
                style={[
                  styles.modalSave,
                  (!editTitle.trim() || isSubmitting) && styles.modalSaveDisabled,
                ]}
              >
                {isSubmitting ? 'Saving...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>APPOINTMENT TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Annual Checkup"
                placeholderTextColor={colors.text.muted}
                value={editTitle}
                onChangeText={setEditTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHEN</Text>
              {renderDateTimePickers(
                editDate,
                showEditDatePicker,
                showEditTimePicker,
                setShowEditDatePicker,
                setShowEditTimePicker,
                onEditDateChange,
                onEditTimeChange,
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LOCATION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Happy Paws Vet Clinic"
                placeholderTextColor={colors.text.muted}
                value={editLocation}
                onChangeText={setEditLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.text.muted}
                value={editNotes}
                onChangeText={setEditNotes}
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
              <Text style={styles.inputLabel}>WHAT NEEDS TO BE DONE?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Flea Medicine, Heartworm Pill"
                placeholderTextColor={colors.text.muted}
                value={recurringTitle}
                onChangeText={setRecurringTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HOW OFTEN?</Text>
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
              <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
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
              <Text style={styles.suggestionsTitle}>QUICK ADD</Text>
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
  sectionLoadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
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
    ...typography.displayMedium,
    color: colors.text.primary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  // sectionTitle inside sectionHeader — no extra marginBottom
  sectionTitle: {
    ...typography.label,
    color: colors.text.secondary,
  },
  // sectionTitle used standalone — needs its own marginBottom
  sectionTitleStandalone: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  addSmallButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Recurring Care — row separators instead of boxed cards
  recurringEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: hairline,
    borderTopColor: colors.border.light,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  recurringEmptyText: {
    flex: 1,
  },
  recurringEmptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  recurringEmptySubtext: {
    ...typography.caption,
    color: colors.text.muted,
  },
  recurringList: {},
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  recurringRowBorder: {
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  recurringContent: {
    flex: 1,
  },
  recurringTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  recurringDue: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: 2,
  },
  recurringInterval: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 1,
  },
  recurringActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markDoneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markDoneButtonDue: {
    backgroundColor: colors.status.warning,
    borderColor: colors.status.warning,
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
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: hairline,
    borderTopColor: colors.border.light,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.text.primary,
    borderRadius: borderRadius.sm,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.text.primary,
    fontSize: 12,
  },

  // Appointment Card — now with explicit action buttons
  appointmentCard: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: hairline,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.background.card,
  },
  appointmentCardNext: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.warm,
  },
  appointmentDate: {
    width: 44,
    alignItems: 'center',
    marginRight: spacing.md,
    paddingTop: 2,
  },
  appointmentDay: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.text.primary,
  },
  appointmentDayNext: {
    color: colors.accent.warm,
  },
  appointmentMonth: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  appointmentTime: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  appointmentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  appointmentLocationText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  appointmentNotes: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  appointmentActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
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
    ...typography.caption,
    fontWeight: '500',
    color: colors.text.muted,
  },
  pastList: {
    marginTop: spacing.sm,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  pastContent: {
    flex: 1,
  },
  pastTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  pastDate: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
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
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  modalCancel: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  modalTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
    fontSize: 17,
    lineHeight: 22,
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalSaveDisabled: {
    color: colors.text.muted,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // Form — underline-style inputs
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
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
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  quickDateText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // Date/Time picker buttons
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
  },
  dateTimeButtonText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text.primary,
  },

  // Interval Options — outlined chips
  intervalOptions: {
    gap: spacing.sm,
  },
  intervalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
    borderRadius: borderRadius.sm,
  },
  intervalOptionSelected: {
    borderColor: colors.text.primary,
  },
  intervalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  intervalOptionTextSelected: {
    fontWeight: '600',
  },

  // Suggestions — outlined chips
  suggestionsSection: {
    marginTop: spacing.md,
  },
  suggestionsTitle: {
    ...typography.label,
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
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.full,
  },
  suggestionText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text.secondary,
  },
});
