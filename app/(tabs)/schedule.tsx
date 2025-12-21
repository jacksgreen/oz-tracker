import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';
import { Id } from '../../convex/_generated/dataModel';

type ShiftType = 'am' | 'pm';

interface ShiftConfig {
  label: string;
  shortLabel: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SHIFT_CONFIG: Record<ShiftType, ShiftConfig> = {
  am: {
    label: 'Morning Shift',
    shortLabel: 'AM',
    description: 'Walk + Breakfast',
    icon: 'sunny',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  pm: {
    label: 'Evening Shift',
    shortLabel: 'PM',
    description: 'Walk + Dinner',
    icon: 'moon',
    color: '#6366F1',
    bgColor: '#E0E7FF',
  },
};

const SHIFT_ORDER: ShiftType[] = ['am', 'pm'];

export default function ScheduleScreen() {
  const { user, household } = useAuth();
  const { onShiftScheduled } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);

  // Get start and end of the current week view
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + (selectedWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedWeekOffset]);

  const startTimestamp = weekDates[0].getTime();
  const endTimestamp = weekDates[6].getTime();

  // Fetch care shifts for the week
  const careShifts = useQuery(
    api.careShifts.getByDateRange,
    household
      ? { householdId: household._id, startDate: startTimestamp, endDate: endTimestamp }
      : 'skip'
  );

  const members = useQuery(
    api.households.getMembers,
    household ? { householdId: household._id } : 'skip'
  );

  // Mutations for scheduling
  const scheduleShift = useMutation(api.careShifts.schedule);
  const clearShiftAssignment = useMutation(api.careShifts.clearAssignment);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const getShiftForDateAndType = (date: Date, shiftType: ShiftType) => {
    const dateTimestamp = new Date(date).setHours(0, 0, 0, 0);
    return careShifts?.find((s) => s.date === dateTimestamp && s.type === shiftType);
  };

  const handleCellPress = (date: Date, shiftType: ShiftType) => {
    setSelectedDate(date);
    setSelectedShift(shiftType);
    setModalVisible(true);
  };

  const handleAssign = async (memberId: Id<'users'>, memberName: string) => {
    if (!selectedDate || !selectedShift || !household) return;
    const dateTimestamp = new Date(selectedDate).setHours(0, 0, 0, 0);

    await scheduleShift({
      householdId: household._id,
      assignedUserId: memberId,
      assignedUserName: memberName,
      type: selectedShift,
      date: dateTimestamp,
    });

    // Send notification for shift scheduling
    await onShiftScheduled(selectedShift, memberName, selectedDate);
    setModalVisible(false);
  };

  const handleClear = async () => {
    if (!selectedDate || !selectedShift || !household) return;
    const dateTimestamp = new Date(selectedDate).setHours(0, 0, 0, 0);

    await clearShiftAssignment({
      householdId: household._id,
      date: dateTimestamp,
      type: selectedShift,
    });
    setModalVisible(false);
  };

  const formatDayHeader = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);

    const isToday = dateNormalized.getTime() === today.getTime();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();

    return { dayName, dayNum, isToday };
  };

  const getWeekLabel = () => {
    if (selectedWeekOffset === 0) return 'This Week';
    if (selectedWeekOffset === 1) return 'Next Week';
    if (selectedWeekOffset === -1) return 'Last Week';
    const startMonth = weekDates[0].toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekDates[0].getDate();
    const endMonth = weekDates[6].toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekDates[6].getDate();
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading states: undefined === loading, null === empty
  const isGridLoading = careShifts === undefined;
  const isMembersLoading = members === undefined;

  if (!household) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Plan Ahead</Text>
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="calendar" size={28} color={colors.primary[500]} />
        </View>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setSelectedWeekOffset((o) => o - 1)}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.weekLabelContainer}>
          <Text style={styles.weekLabel}>{getWeekLabel()}</Text>
          {selectedWeekOffset !== 0 && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => setSelectedWeekOffset(0)}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setSelectedWeekOffset((o) => o + 1)}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

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
        {/* Schedule Grid */}
        <View style={styles.gridContainer}>
          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            <View style={styles.shiftLabelSpacer} />
            {weekDates.map((date, index) => {
              const { dayName, dayNum, isToday } = formatDayHeader(date);
              return (
                <View
                  key={index}
                  style={[styles.dayHeader, isToday && styles.dayHeaderToday]}
                >
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                    {dayNum}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Shift Rows */}
          {isGridLoading ? (
            <View style={styles.gridLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
              <Text style={styles.gridLoadingText}>Loading schedule...</Text>
            </View>
          ) : (
            SHIFT_ORDER.map((shiftType) => {
              const config = SHIFT_CONFIG[shiftType];
              return (
                <View key={shiftType} style={styles.shiftRow}>
                  <View style={[styles.shiftLabel, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={config.icon} size={18} color={config.color} />
                    <Text style={[styles.shiftLabelText, { color: config.color }]}>
                      {config.shortLabel}
                    </Text>
                  </View>
                  {weekDates.map((date, index) => {
                    const entry = getShiftForDateAndType(date, shiftType);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isCompleted = entry?.completed;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.cell,
                          entry && styles.cellAssigned,
                          isCompleted && styles.cellCompleted,
                          isPast && !isCompleted && styles.cellPast,
                        ]}
                        onPress={() => !isCompleted && handleCellPress(date, shiftType)}
                        activeOpacity={isCompleted ? 1 : 0.7}
                      >
                        {entry ? (
                          isCompleted ? (
                            <View style={styles.completedBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={28}
                                color={colors.status.success}
                              />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.assignedBadge,
                                { backgroundColor: config.bgColor },
                              ]}
                            >
                              <Text
                                style={[styles.assignedInitials, { color: config.color }]}
                              >
                                {getInitials(entry.assignedUserName)}
                              </Text>
                            </View>
                          )
                        ) : (
                          !isPast && (
                            <View style={styles.emptyCell}>
                              <Ionicons
                                name="add"
                                size={18}
                                color={colors.text.muted}
                              />
                            </View>
                          )
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>

        {/* Shift Explanation */}
        <View style={styles.shiftExplanation}>
          <Text style={styles.shiftExplanationTitle}>How shifts work</Text>
          <View style={styles.shiftExplanationRow}>
            <View style={[styles.shiftExplanationIcon, { backgroundColor: SHIFT_CONFIG.am.bgColor }]}>
              <Ionicons name="sunny" size={16} color={SHIFT_CONFIG.am.color} />
            </View>
            <View style={styles.shiftExplanationText}>
              <Text style={styles.shiftExplanationLabel}>AM Shift</Text>
              <Text style={styles.shiftExplanationDesc}>Morning walk + breakfast</Text>
            </View>
          </View>
          <View style={styles.shiftExplanationRow}>
            <View style={[styles.shiftExplanationIcon, { backgroundColor: SHIFT_CONFIG.pm.bgColor }]}>
              <Ionicons name="moon" size={16} color={SHIFT_CONFIG.pm.color} />
            </View>
            <View style={styles.shiftExplanationText}>
              <Text style={styles.shiftExplanationLabel}>PM Shift</Text>
              <Text style={styles.shiftExplanationDesc}>Evening walk + dinner</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Household Members</Text>
          {isMembersLoading ? (
            <View style={styles.legendLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
            </View>
          ) : (
            <View style={styles.legendList}>
              {members?.map((member) => (
                <View key={member._id} style={styles.legendItem}>
                  <View style={styles.legendBadge}>
                    <Text style={styles.legendInitials}>{getInitials(member.name)}</Text>
                  </View>
                  <Text style={styles.legendName}>
                    {member.name}
                    {member._id === user?._id && ' (You)'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={20} color={colors.primary[600]} />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Quick Tip</Text>
            <Text style={styles.tipText}>
              Tap any cell to assign a shift. The person assigned handles both the walk and meal for that time of day.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedShift && selectedDate && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalShiftIcon,
                      { backgroundColor: SHIFT_CONFIG[selectedShift].bgColor },
                    ]}
                  >
                    <Ionicons
                      name={SHIFT_CONFIG[selectedShift].icon}
                      size={28}
                      color={SHIFT_CONFIG[selectedShift].color}
                    />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>
                      {SHIFT_CONFIG[selectedShift].label}
                    </Text>
                    <Text style={styles.modalDescription}>
                      {SHIFT_CONFIG[selectedShift].description}
                    </Text>
                    <Text style={styles.modalDate}>
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSubtitle}>Who's taking this shift?</Text>

                <View style={styles.memberList}>
                  {members?.map((member) => {
                    const currentEntry = getShiftForDateAndType(selectedDate, selectedShift);
                    const isAssigned = currentEntry?.assignedUserId === member._id;
                    return (
                      <TouchableOpacity
                        key={member._id}
                        style={[
                          styles.memberOption,
                          isAssigned && styles.memberOptionSelected,
                        ]}
                        onPress={() => handleAssign(member._id, member.name)}
                      >
                        <View
                          style={[
                            styles.memberBadge,
                            isAssigned && styles.memberBadgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.memberInitials,
                              isAssigned && styles.memberInitialsSelected,
                            ]}
                          >
                            {getInitials(member.name)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.memberName,
                            isAssigned && styles.memberNameSelected,
                          ]}
                        >
                          {member.name}
                          {member._id === user?._id && ' (You)'}
                        </Text>
                        {isAssigned && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={colors.primary[500]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {getShiftForDateAndType(selectedDate, selectedShift) &&
                 !getShiftForDateAndType(selectedDate, selectedShift)?.completed && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                    <Text style={styles.clearButtonText}>Clear Assignment</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
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
  gridLoadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gridLoadingText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  legendLoadingContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Week Navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  weekLabelContainer: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  todayButton: {
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.full,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // Grid
  gridContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  shiftLabelSpacer: {
    width: 56,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
  },
  dayHeaderToday: {
    backgroundColor: colors.primary[500],
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: colors.text.inverse,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  dayNumToday: {
    color: colors.text.inverse,
  },

  // Shift Rows
  shiftRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  shiftLabel: {
    width: 56,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
  },
  shiftLabelText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    height: 56,
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellAssigned: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.light,
  },
  cellCompleted: {
    backgroundColor: colors.status.successBg,
    borderColor: colors.status.success,
  },
  cellPast: {
    opacity: 0.4,
  },
  emptyCell: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedInitials: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shift Explanation
  shiftExplanation: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  shiftExplanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  shiftExplanationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  shiftExplanationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftExplanationText: {
    flex: 1,
  },
  shiftExplanationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  shiftExplanationDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Legend
  legendSection: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  legendList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[600],
  },
  legendName: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modalShiftIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.primary[600],
    fontWeight: '500',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  memberList: {
    gap: spacing.sm,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.muted,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  memberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  memberBadgeSelected: {
    backgroundColor: colors.primary[500],
  },
  memberInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  memberInitialsSelected: {
    color: colors.text.inverse,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  memberNameSelected: {
    fontWeight: '600',
    color: colors.primary[700],
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },
});
