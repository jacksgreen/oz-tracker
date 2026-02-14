import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { colors, spacing, borderRadius, shadows, typography, fonts, hairline } from '../../lib/theme';
import { getInitials, getMemberColor } from '../../lib/utils';
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
    color: '#8A7B6B',
    bgColor: colors.background.secondary,
  },
  pm: {
    label: 'Evening Shift',
    shortLabel: 'PM',
    description: 'Walk + Dinner',
    icon: 'moon',
    color: '#7A756F',
    bgColor: colors.background.muted,
  },
};

const SHIFT_ORDER: ShiftType[] = ['am', 'pm'];

export default function ScheduleScreen() {
  const { user, household } = useCurrentUser();
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
      ? { startDate: startTimestamp, endDate: endTimestamp }
      : 'skip'
  );

  const members = useQuery(
    api.households.getMembers,
    household ? {} : 'skip'
  );

  // Mutations for scheduling
  const scheduleShift = useMutation(api.careShifts.schedule);
  const clearShiftAssignment = useMutation(api.careShifts.clearAssignment);

  const getShiftForDateAndType = (date: Date, shiftType: ShiftType) => {
    const dateTimestamp = new Date(date).setHours(0, 0, 0, 0);
    return careShifts?.find((s) => s.date === dateTimestamp && s.type === shiftType);
  };

  const handleCellPress = (date: Date, shiftType: ShiftType) => {
    setSelectedDate(date);
    setSelectedShift(shiftType);
    setModalVisible(true);
  };

  const handleAssign = async (memberId: Id<'users'>) => {
    if (!selectedDate || !selectedShift || !household) return;
    const dateTimestamp = new Date(selectedDate).setHours(0, 0, 0, 0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await scheduleShift({
      assignedUserId: memberId,
      type: selectedShift,
      date: dateTimestamp,
    });

    setModalVisible(false);
  };

  const handleClear = async () => {
    if (!selectedDate || !selectedShift || !household) return;
    const dateTimestamp = new Date(selectedDate).setHours(0, 0, 0, 0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await clearShiftAssignment({
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

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    members?.forEach((m) => { map[m._id] = m.name; });
    return map;
  }, [members]);

  // Loading states: undefined === loading, null === empty
  const isGridLoading = careShifts === undefined;
  const isMembersLoading = members === undefined;

  if (!household) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>PLAN AHEAD</Text>
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setSelectedWeekOffset((o) => o - 1)}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
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
          <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
              <ActivityIndicator size="small" color={colors.text.muted} />
              <Text style={styles.gridLoadingText}>Loading schedule...</Text>
            </View>
          ) : (
            SHIFT_ORDER.map((shiftType) => {
              const config = SHIFT_CONFIG[shiftType];
              return (
                <View key={shiftType} style={styles.shiftRow}>
                  <View style={styles.shiftLabel}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
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
                        accessibilityRole="button"
                        accessibilityLabel={
                          `${date.toLocaleDateString('en-US', { weekday: 'long' })} ${config.shortLabel} shift` +
                          (isCompleted
                            ? `, completed by ${memberMap[entry?.assignedUserId] ?? 'Someone'}`
                            : entry
                              ? `, assigned to ${memberMap[entry.assignedUserId] ?? 'Someone'}, tap to reassign`
                              : isPast
                                ? ', past'
                                : ', unassigned, tap to assign')
                        }
                      >
                        {entry ? (
                          isCompleted ? (
                            <View style={styles.completedBadge}>
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={colors.status.success}
                              />
                            </View>
                          ) : (
                            <View style={[styles.assignedBadge, { backgroundColor: getMemberColor(memberMap[entry.assignedUserId] ?? '').bg }]}>
                              <Text style={[styles.assignedInitials, { color: getMemberColor(memberMap[entry.assignedUserId] ?? '').text }]}>
                                {getInitials(memberMap[entry.assignedUserId] ?? '?')}
                              </Text>
                            </View>
                          )
                        ) : (
                          !isPast && (
                            <View style={styles.emptyCell}>
                              <Ionicons
                                name="add"
                                size={16}
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

        {/* Empty State Encouragement */}
        {!isGridLoading && careShifts && careShifts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Plan your week</Text>
            <Text style={styles.emptyStateSubtext}>
              Assign shifts so everyone knows who's on duty
            </Text>
          </View>
        )}

        {/* Shift Explanation — simplified */}
        <View style={styles.shiftExplanation}>
          <Text style={styles.shiftExplanationTitle}>SHIFTS</Text>
          <View style={styles.shiftExplanationRow}>
            <Ionicons name="sunny" size={14} color={SHIFT_CONFIG.am.color} />
            <Text style={styles.shiftExplanationLabel}>AM</Text>
            <Text style={styles.shiftExplanationDesc}>Morning walk + breakfast</Text>
          </View>
          <View style={styles.shiftExplanationRow}>
            <Ionicons name="moon" size={14} color={SHIFT_CONFIG.pm.color} />
            <Text style={styles.shiftExplanationLabel}>PM</Text>
            <Text style={styles.shiftExplanationDesc}>Evening walk + dinner</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>HOUSEHOLD MEMBERS</Text>
          {isMembersLoading ? (
            <View style={styles.legendLoadingContainer}>
              <ActivityIndicator size="small" color={colors.text.muted} />
            </View>
          ) : (
            <View style={styles.legendList}>
              {members?.map((member) => (
                <View key={member._id} style={styles.legendItem}>
                  <View style={[styles.legendBadge, { backgroundColor: getMemberColor(member.name).bg }]}>
                    <Text style={[styles.legendInitials, { color: getMemberColor(member.name).text }]}>{getInitials(member.name)}</Text>
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

        {/* Tip — minimal */}
        <Text style={styles.tipText}>
          Tap any cell to assign a shift.
        </Text>
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
            <View style={styles.modalHandle} />
            {selectedShift && selectedDate && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>
                      {SHIFT_CONFIG[selectedShift].label}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalAssignLabel}>ASSIGN TO</Text>

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
                        onPress={() => handleAssign(member._id)}
                      >
                        <View
                          style={[
                            styles.memberBadge,
                            !isAssigned && { backgroundColor: getMemberColor(member.name).bg },
                            isAssigned && styles.memberBadgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.memberInitials,
                              !isAssigned && { color: getMemberColor(member.name).text },
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
                            name="checkmark"
                            size={20}
                            color={colors.text.primary}
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
  gridLoadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gridLoadingText: {
    ...typography.caption,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerSubtitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text.primary,
  },

  // Week Navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabelContainer: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text.primary,
  },
  todayButton: {
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.sm,
  },
  todayButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.inverse,
    letterSpacing: 1,
  },

  // Grid
  gridContainer: {
    borderWidth: hairline,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.card,
    ...shadows.sm,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  shiftLabelSpacer: {
    width: 48,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginHorizontal: 1,
  },
  dayHeaderToday: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.md,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNameToday: {
    color: colors.text.inverse,
  },
  dayNum: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 2,
  },
  dayNumToday: {
    color: colors.text.inverse,
  },

  // Shift Rows
  shiftRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  shiftLabel: {
    width: 48,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  shiftLabelText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cell: {
    flex: 1,
    height: 52,
    marginHorizontal: 1,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: hairline,
    borderColor: 'transparent',
  },
  cellAssigned: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.light,
  },
  cellCompleted: {
    backgroundColor: colors.status.successBg,
    borderColor: colors.border.light,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  assignedInitials: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
  },
  completedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    ...typography.displayItalic,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Shift Explanation — simplified
  shiftExplanation: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  shiftExplanationTitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  shiftExplanationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  shiftExplanationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    width: 24,
  },
  shiftExplanationDesc: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Legend
  legendSection: {
    marginBottom: spacing.lg,
  },
  legendTitle: {
    ...typography.label,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendInitials: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
  },
  legendName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
  },

  // Tip — minimal
  tipText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.medium,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  modalAssignLabel: {
    ...typography.label,
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
    borderRadius: borderRadius.md,
    borderWidth: hairline,
    borderColor: colors.border.light,
  },
  memberOptionSelected: {
    borderColor: colors.text.primary,
  },
  memberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberBadgeSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  memberInitials: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text.primary,
  },
  memberInitialsSelected: {
    color: colors.text.inverse,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  memberNameSelected: {
    fontWeight: '600',
  },
  clearButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  clearButtonText: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
});
