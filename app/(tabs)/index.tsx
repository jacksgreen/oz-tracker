import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { colors, spacing, borderRadius, shadows, typography, fonts, hairline } from '../../lib/theme';
import { formatDate, formatTime, getMemberColor, getInitials } from '../../lib/utils';

// Get today's start-of-day timestamp in local timezone
const getTodayTimestamp = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
};

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const shiftTransition = LayoutAnimation.create(
  250,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

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

  // Undo toast state
  const [undoToast, setUndoToast] = useState<{ type: ShiftType; label: string } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndoToast = useCallback((type: ShiftType, label: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setUndoToast({ type, label });
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setUndoToast(null);
      });
    }, 4000);
  }, [toastOpacity]);

  const dismissUndoToast = useCallback(() => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setUndoToast(null);
    });
  }, [toastOpacity]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const members = useQuery(
    api.households.getMembers,
    household ? {} : 'skip'
  );

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    members?.forEach((m) => { map[m._id] = m.name; });
    return map;
  }, [members]);

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

  // Animate layout when shift completion state changes
  const prevAmCompleted = useRef(amShift?.completed);
  const prevPmCompleted = useRef(pmShift?.completed);
  useEffect(() => {
    if (
      prevAmCompleted.current !== amShift?.completed ||
      prevPmCompleted.current !== pmShift?.completed
    ) {
      LayoutAnimation.configureNext(shiftTransition);
    }
    prevAmCompleted.current = amShift?.completed;
    prevPmCompleted.current = pmShift?.completed;
  }, [amShift?.completed, pmShift?.completed]);

  const handleLogShift = async (type: ShiftType) => {
    if (!user || !household) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await logShift({
      type,
      clientDate: startOfDay.getTime(),
    });

    showUndoToast(type, SHIFT_CONFIG[type].label);
  };

  const handleUndoShift = async (shiftId: NonNullable<typeof amShift>['_id']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissUndoToast();
    await uncompleteShift({ shiftId });
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
        accessibilityRole="button"
        accessibilityLabel={
          isCompleted
            ? `${config.label}, completed by ${shift?.completedByUserId ? (memberMap[shift.completedByUserId] ?? 'Someone') : 'Someone'} at ${shift?.completedAt ? formatTime(shift.completedAt) : ''}, tap to undo`
            : shift
              ? `${config.label}, assigned to ${memberMap[shift.assignedUserId] ?? 'Someone'}, tap to mark as done`
              : `${config.label}, unassigned, tap to mark as done`
        }
      >
        <View style={styles.shiftCardHeader}>
          <Ionicons name={config.icon} size={18} color={isCompleted ? colors.status.success : config.color} style={{ marginRight: spacing.sm }} />
          <View style={styles.shiftTitleContainer}>
            <Text style={[styles.shiftLabel, isCompleted && styles.shiftLabelComplete]}>{config.label}</Text>
            <Text style={styles.shiftDescription}>{config.description}</Text>
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.shiftStatusRow}>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={15} color={colors.status.success} />
            </View>
            <Text style={styles.statusNameComplete}>{shift.completedByUserId ? (memberMap[shift.completedByUserId] ?? 'Someone') : 'Someone'}</Text>
            <View style={styles.statusDot} />
            <Text style={styles.statusTime}>{formatTime(shift.completedAt!)}</Text>
          </View>
        ) : (
          <View style={styles.shiftStatusRow}>
            {shift ? (
              <>
                <View style={[styles.assignedBadge, { backgroundColor: getMemberColor(memberMap[shift.assignedUserId] ?? '').bg }]}>
                  <Text style={[styles.assignedInitial, { color: getMemberColor(memberMap[shift.assignedUserId] ?? '').text }]}>
                    {getInitials(memberMap[shift.assignedUserId] ?? '?')}
                  </Text>
                </View>
                <Text style={styles.statusName}>{memberMap[shift.assignedUserId] ?? 'Someone'}</Text>
              </>
            ) : (
              <>
                <View style={styles.unassignedBadge}>
                  <Ionicons name="ellipsis-horizontal" size={14} color={colors.text.muted} />
                </View>
                <Text style={styles.statusNameMuted}>Unassigned</Text>
              </>
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
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dogName}>{household.dogName}'s Day</Text>
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

      {/* Undo Toast */}
      {undoToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{undoToast.label} completed</Text>
          <TouchableOpacity
            onPress={() => {
              const shift = undoToast.type === 'am' ? amShift : pmShift;
              if (shift?.completed) handleUndoShift(shift._id);
            }}
            accessibilityLabel="Undo shift completion"
            accessibilityRole="button"
            style={styles.toastUndoButton}
          >
            <Text style={styles.toastUndo}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...shadows.sm,
  },
  shiftCardComplete: {
    backgroundColor: colors.status.successBg,
    borderColor: colors.status.successBg,
    borderLeftColor: colors.status.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  shiftLabelComplete: {
    color: colors.text.secondary,
  },
  shiftDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Shared status row — same skeleton for both states
  shiftStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },

  // Completed state badge
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.status.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pending assigned badge
  assignedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedInitial: {
    fontFamily: fonts.serif,
    fontSize: 14,
  },

  // Pending unassigned badge
  unassignedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shared text styles
  statusName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: 0.1,
  },
  statusNameComplete: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.secondary,
    letterSpacing: 0.1,
  },
  statusNameMuted: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.muted,
    letterSpacing: 0.1,
  },
  statusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
  },
  statusTime: {
    ...typography.caption,
    color: colors.text.secondary,
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
    ...shadows.sm,
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
    ...shadows.sm,
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

  // Undo Toast
  toast: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.lg,
    shadowOpacity: 0.15,
  },
  toastText: {
    ...typography.body,
    color: colors.text.inverse,
  },
  toastUndoButton: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  toastUndo: {
    ...typography.button,
    fontSize: 13,
    color: colors.accent.warm,
  },
});
