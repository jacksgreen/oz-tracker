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
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';

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
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  pm: {
    label: 'Evening Shift',
    description: 'Walk + Dinner',
    icon: 'moon',
    color: '#6366F1',
    bgColor: '#E0E7FF',
  },
};

export default function HomeScreen() {
  const { user, household } = useAuth();
  const { onShiftCompleted } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const todayTimestamp = getTodayTimestamp();

  const todayShifts = useQuery(
    api.careShifts.getToday,
    household ? { householdId: household._id, clientDate: todayTimestamp } : 'skip'
  );

  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? { householdId: household._id } : 'skip'
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
      householdId: household._id,
      userId: user._id,
      userName: user.name,
      type,
      clientDate: startOfDay.getTime(),
    });

    // Send notification for shift completion
    await onShiftCompleted(type, user.name);
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
        <ActivityIndicator size="large" color={colors.primary[500]} />
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
          <View style={[styles.shiftIconContainer, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.shiftTitleContainer}>
            <Text style={styles.shiftLabel}>{config.label}</Text>
            <Text style={styles.shiftDescription}>{config.description}</Text>
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.shiftCompleteContent}>
            <View style={styles.shiftCompleteRow}>
              <Ionicons name="checkmark-circle" size={28} color={colors.status.success} />
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
                <View style={[styles.assignedBadge, { backgroundColor: config.bgColor }]}>
                  <Text style={[styles.assignedInitial, { color: config.color }]}>
                    {shift.assignedUserName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.assignedTextContainer}>
                  <Text style={styles.assignedLabel}>Assigned to</Text>
                  <Text style={styles.assignedName}>{shift.assignedUserName}</Text>
                </View>
                <View style={styles.tapIndicator}>
                  <Ionicons name="checkmark" size={18} color={colors.text.muted} />
                </View>
              </View>
            ) : (
              <View style={styles.shiftUnassignedRow}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="add" size={20} color={colors.text.muted} />
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
            tintColor={colors.primary[500]}
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
            <Text style={styles.avatar}>🐕</Text>
          </View>
        </View>

        {/* Today's Shifts */}
        <View style={styles.shiftsSection}>
          {isShiftsLoading ? (
            <>
              <View style={styles.shiftCardSkeleton}>
                <ActivityIndicator size="small" color={colors.primary[400]} />
              </View>
              <View style={styles.shiftCardSkeleton}>
                <ActivityIndicator size="small" color={colors.primary[400]} />
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
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressCircleContainer}>
              <View style={[
                styles.progressCircle,
                completedShifts === 2 && styles.progressCircleComplete
              ]}>
                <Text style={[
                  styles.progressNumber,
                  completedShifts === 2 && styles.progressNumberComplete
                ]}>
                  {completedShifts}
                </Text>
                <Text style={[
                  styles.progressOf,
                  completedShifts === 2 && styles.progressOfComplete
                ]}>
                  of 2
                </Text>
              </View>
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressLabel}>Shifts Completed</Text>
              <Text style={styles.progressSubtext}>
                {completedShifts === 0 && "No shifts done yet today"}
                {completedShifts === 1 && "One more shift to go!"}
                {completedShifts === 2 && "All done for today!"}
              </Text>
            </View>
            {completedShifts === 2 && (
              <View style={styles.progressCheckmark}>
                <Ionicons name="ribbon" size={28} color={colors.status.success} />
              </View>
            )}
          </View>
        </View>

        {/* Upcoming Appointment */}
        {isAppointmentsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Appointment</Text>
            <View style={styles.appointmentCardSkeleton}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
            </View>
          </View>
        ) : nextAppointment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Appointment</Text>
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentIcon}>
                <Ionicons name="medical" size={24} color={colors.primary[600]} />
              </View>
              <View style={styles.appointmentContent}>
                <Text style={styles.appointmentTitle}>{nextAppointment.title}</Text>
                <Text style={styles.appointmentDate}>
                  {formatDate(nextAppointment.date)} at {formatTime(nextAppointment.date)}
                </Text>
                {nextAppointment.location && (
                  <View style={styles.appointmentLocation}>
                    <Ionicons name="location" size={14} color={colors.text.muted} />
                    <Text style={styles.appointmentLocationText}>
                      {nextAppointment.location}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text.secondary,
  },
  shiftCardSkeleton: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  appointmentCardSkeleton: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dogName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  avatar: {
    fontSize: 28,
  },

  // Shifts Section
  shiftsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  shiftCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  shiftCardComplete: {
    backgroundColor: colors.status.successBg,
    borderColor: colors.status.success,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shiftIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  shiftTitleContainer: {
    flex: 1,
  },
  shiftLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  shiftDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Shift Complete State
  shiftCompleteContent: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.status.success,
  },
  shiftCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shiftCompleteText: {
    flex: 1,
  },
  shiftCompletedBy: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  shiftCompletedTime: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Shift Pending State
  shiftPendingContent: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  shiftAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  assignedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  assignedTextContainer: {
    flex: 1,
  },
  assignedLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 2,
  },
  assignedName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tapIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.muted,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border.medium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToLog: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Progress Card
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  progressCircleContainer: {
    marginRight: spacing.lg,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.muted,
    borderWidth: 3,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleComplete: {
    backgroundColor: colors.status.successBg,
    borderColor: colors.status.success,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressNumberComplete: {
    color: colors.status.success,
  },
  progressOf: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: -2,
  },
  progressOfComplete: {
    color: colors.status.success,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: 13,
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
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    ...shadows.sm,
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
  appointmentDate: {
    fontSize: 14,
    color: colors.primary[600],
    fontWeight: '500',
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
});
