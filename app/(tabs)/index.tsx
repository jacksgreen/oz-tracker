import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { colors, spacing, borderRadius, shadows, typography, fonts, hairline } from '../../lib/theme';

// Get today's start-of-day timestamp in local timezone
const getTodayTimestamp = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
};

type ShiftType = 'am' | 'pm';

interface ShiftConfig {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SHIFT_CONFIG: Record<ShiftType, ShiftConfig> = {
  am: {
    label: 'Morning Shift',
    description: 'Walk + Breakfast',
    icon: 'sunny',
    color: '#8A7B6B',
    bgColor: colors.background.secondary,
  },
  pm: {
    label: 'Evening Shift',
    description: 'Walk + Dinner',
    icon: 'moon',
    color: '#7A756F',
    bgColor: colors.background.muted,
  },
};

export default function HomeScreen() {
  const { user, household } = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);

  const todayTimestamp = getTodayTimestamp();

  const todayShifts = useQuery(
    api.careShifts.getToday,
    household ? { clientDate: todayTimestamp } : 'skip'
  );

  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? {} : 'skip'
  );

  const logShift = useMutation(api.careShifts.logNow);
  const uncompleteShift = useMutation(api.careShifts.uncomplete);

  // Find entries for each shift type
  const amShift = todayShifts?.find((s) => s.type === 'am');
  const pmShift = todayShifts?.find((s) => s.type === 'pm');

  const nextAppointment = upcomingAppointments?.[0];

  const handleLogShift = async (type: ShiftType) => {
    if (!user || !household) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    await logShift({
      type,
      clientDate: startOfDay.getTime(),
    });
  };

  const handleUndoShift = async (shiftId: NonNullable<typeof amShift>['_id']) => {
    await uncompleteShift({ shiftId });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
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
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const completedShifts = (amShift?.completed ? 1 : 0) + (pmShift?.completed ? 1 : 0);

  // Loading states: undefined === loading, null === empty
  const isShiftsLoading = todayShifts === undefined;
  const isAppointmentsLoading = upcomingAppointments === undefined;

  if (!household) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  const renderShiftCard = (type: ShiftType, shift: typeof amShift) => {
    const config = SHIFT_CONFIG[type];
    const isCompleted = shift?.completed;

    return (
      <TouchableOpacity
        key={type}
        style={[styles.shiftCard, isCompleted && styles.shiftCardComplete]}
        onPress={() => isCompleted && shift ? handleUndoShift(shift._id) : handleLogShift(type)}
        activeOpacity={0.7}
      >
        <View style={styles.shiftCardHeader}>
          <Ionicons name={config.icon} size={18} color={config.color} style={{ marginRight: spacing.sm }} />
          <View style={styles.shiftTitleContainer}>
            <Text style={styles.shiftLabel}>{config.label}</Text>
            <Text style={styles.shiftDescription}>{config.description}</Text>
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.shiftCompleteContent}>
            <View style={styles.shiftCompleteRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.status.success} />
              <View style={styles.shiftCompleteText}>
                <Text style={styles.shiftCompletedBy}>{shift.completedByUserName}</Text>
                <Text style={styles.shiftCompletedTime}>{formatTime(shift.completedAt!)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.shiftPendingContent}>
            {shift ? (
              <View style={styles.shiftAssignedRow}>
                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedInitial}>
                    {shift.assignedUserName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.assignedTextContainer}>
                  <Text style={styles.assignedLabel}>Assigned to</Text>
                  <Text style={styles.assignedName}>{shift.assignedUserName}</Text>
                </View>
                <View style={styles.tapIndicator}>
                  <Ionicons name="checkmark" size={16} color={colors.text.muted} />
                </View>
              </View>
            ) : (
              <View style={styles.shiftUnassignedRow}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="add" size={18} color={colors.text.muted} />
                </View>
                <Text style={styles.tapToLog}>Tap to mark as done</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
            tintColor={colors.text.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dogName}>{household.dogName}'s Day</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {household.dogName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Today's Shifts */}
        <View style={styles.shiftsSection}>
          {isShiftsLoading ? (
            <>
              <View style={styles.shiftCardSkeleton}>
                <ActivityIndicator size="small" color={colors.text.muted} />
              </View>
              <View style={styles.shiftCardSkeleton}>
                <ActivityIndicator size="small" color={colors.text.muted} />
              </View>
            </>
          ) : (
            <>
              {renderShiftCard('am', amShift)}
              {renderShiftCard('pm', pmShift)}
            </>
          )}
        </View>

        {/* Today's Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S PROGRESS</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressNumberContainer}>
              <Text style={[
                styles.progressNumber,
                completedShifts === 2 && styles.progressNumberComplete
              ]}>
                {completedShifts}
              </Text>
              <Text style={styles.progressOf}>of 2</Text>
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressLabel}>Shifts Completed</Text>
              <Text style={styles.progressSubtext}>
                {completedShifts === 0 && "No shifts done yet today"}
                {completedShifts === 1 && "One more shift to go"}
                {completedShifts === 2 && "All done for today"}
              </Text>
            </View>
            {completedShifts === 2 && (
              <View style={styles.progressCheckmark}>
                <Ionicons name="ribbon" size={24} color={colors.status.success} />
              </View>
            )}
          </View>
        </View>

        {/* Upcoming Appointment */}
        {isAppointmentsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UPCOMING APPOINTMENT</Text>
            <View style={styles.appointmentCardSkeleton}>
              <ActivityIndicator size="small" color={colors.text.muted} />
            </View>
          </View>
        ) : nextAppointment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UPCOMING APPOINTMENT</Text>
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentContent}>
                <Text style={styles.appointmentTitle}>{nextAppointment.title}</Text>
                <Text style={styles.appointmentDate}>
                  {formatDate(nextAppointment.date)} at {formatTime(nextAppointment.date)}
                </Text>
                {nextAppointment.location && (
                  <View style={styles.appointmentLocation}>
                    <Ionicons name="location-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.appointmentLocationText}>
                      {nextAppointment.location}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </View>
          </View>
        )}
      </ScrollView>
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
  shiftCardSkeleton: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCardSkeleton: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
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
  greeting: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  dogName: {
    ...typography.displayLarge,
    color: colors.text.primary,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  avatar: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.text.primary,
  },

  // Shifts Section
  shiftsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  shiftCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
  },
  shiftCardComplete: {
    borderLeftWidth: 3,
    borderLeftColor: colors.status.success,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shiftTitleContainer: {
    flex: 1,
  },
  shiftLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 2,
  },
  shiftDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Shift Complete State
  shiftCompleteContent: {
    paddingTop: spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: colors.border.light,
  },
  shiftCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shiftCompleteText: {
    flex: 1,
  },
  shiftCompletedBy: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  shiftCompletedTime: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Shift Pending State
  shiftPendingContent: {
    paddingTop: spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: colors.border.light,
  },
  shiftAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  assignedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  assignedInitial: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text.primary,
  },
  assignedTextContainer: {
    flex: 1,
  },
  assignedLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 2,
  },
  assignedName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  tapIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: hairline,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Unassigned State
  shiftUnassignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToLog: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  // Progress Card
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
  },
  progressNumberContainer: {
    marginRight: spacing.lg,
    alignItems: 'center',
  },
  progressNumber: {
    fontFamily: fonts.serif,
    fontSize: 38,
    color: colors.text.primary,
    lineHeight: 42,
  },
  progressNumberComplete: {
    color: colors.status.success,
  },
  progressOf: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: -4,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  progressSubtext: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  progressCheckmark: {
    marginLeft: spacing.sm,
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.light,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.warm,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 4,
  },
  appointmentDate: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
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
});
