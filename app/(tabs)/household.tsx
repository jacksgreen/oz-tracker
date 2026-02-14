import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { useClerk } from '@clerk/clerk-expo';
import { colors, spacing, borderRadius, typography, fonts, hairline } from '../../lib/theme';
import { getInitials, getMemberColor } from '../../lib/utils';

export default function HouseholdScreen() {
  const { user, household } = useCurrentUser();
  const { signOut } = useClerk();
  const [copied, setCopied] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDogName, setEditDogName] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const updateHousehold = useMutation(api.households.update);
  const regenerateCode = useMutation(api.households.regenerateInviteCode);

  const members = useQuery(
    api.households.getMembers,
    household ? {} : 'skip'
  );

  const handleShareInviteCode = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Join my household "${household.name}" on Dog Duty! Use invite code: ${household.inviteCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyInviteCode = async () => {
    if (!household) return;
    await Clipboard.setStringAsync(household.inviteCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Reset Invite Code',
      'This will invalidate the current code. Anyone with the old code will no longer be able to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Code',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              await regenerateCode();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Failed to reset invite code. Please try again.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    if (!household) return;
    setEditName(household.name);
    setEditDogName(household.dogName);
    setEditError('');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedDogName = editDogName.trim();

    if (!trimmedName) {
      setEditError('Household name is required');
      return;
    }
    if (!trimmedDogName) {
      setEditError("Dog's name is required");
      return;
    }

    setSaving(true);
    setEditError('');
    try {
      await updateHousehold({ name: trimmedName, dogName: trimmedDogName });
      setEditModalVisible(false);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Loading states: undefined === loading, null === empty
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
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleOpenEdit}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Household settings"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.householdName}>{household.name}</Text>
          <Text style={styles.headerSubtitle}>
            Taking care of {household.dogName} together
          </Text>
        </View>

        {/* Invite Code */}
        <View style={styles.inviteSection}>
          <Text style={styles.sectionTitle} accessibilityRole="header">INVITE CODE</Text>
          <Text
            style={styles.codeText}
            accessibilityLabel={`Invite code: ${household.inviteCode.split('').join(' ')}`}
          >
            {household.inviteCode}
          </Text>
          <View style={styles.codeActionRow}>
            <TouchableOpacity
              style={styles.codeAction}
              onPress={handleCopyInviteCode}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Copy invite code"
              accessibilityRole="button"
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={13}
                color={copied ? colors.status.success : colors.text.muted}
              />
              <Text style={[styles.codeActionText, copied && { color: colors.status.success }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.codeActionDivider}>{'\u00B7'}</Text>
            <TouchableOpacity
              style={styles.codeAction}
              onPress={handleShareInviteCode}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Share invite code"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={13} color={colors.text.muted} />
              <Text style={styles.codeActionText}>Share</Text>
            </TouchableOpacity>
            <Text style={styles.codeActionDivider}>{'\u00B7'}</Text>
            <TouchableOpacity
              style={styles.codeAction}
              onPress={handleRegenerateCode}
              disabled={regenerating}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {regenerating ? (
                <ActivityIndicator size="small" color={colors.text.muted} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={13} color={colors.text.muted} />
                  <Text style={styles.codeActionText}>Reset</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MEMBERS</Text>
            <Text style={styles.memberCount}>{members?.length || 0}</Text>
          </View>

          {isMembersLoading ? (
            <View style={styles.membersLoadingContainer}>
              <ActivityIndicator size="small" color={colors.text.muted} />
            </View>
          ) : (
            <View style={styles.membersList}>
              {members?.map((member, index) => {
                const isCurrentUser = member._id === user?._id;
                const memberColor = getMemberColor(member.name);

                return (
                  <View
                    key={member._id}
                    style={[
                      styles.memberRow,
                      index < (members?.length || 0) - 1 && styles.memberRowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: memberColor.bg },
                      ]}
                    >
                      <Text style={[styles.memberInitials, { color: memberColor.text }]}>
                        {getInitials(member.name)}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    {isCurrentUser && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Sign Out — understated */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Household Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Household</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={saving} activeOpacity={0.8}>
                <Text style={[styles.modalSaveText, saving && styles.modalSaveTextDisabled]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>HOUSEHOLD NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={(text) => { setEditName(text); setEditError(''); }}
                  placeholder="Enter household name"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>DOG'S NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDogName}
                  onChangeText={(text) => { setEditDogName(text); setEditError(''); }}
                  placeholder="Enter dog's name"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveEdit}
                />
              </View>

              {editError ? (
                <Text style={styles.modalError}>{editError}</Text>
              ) : null}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  membersLoadingContainer: {
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

  // Header — no icon, serif name
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  householdName: {
    ...typography.displayLarge,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },

  // Invite Code
  inviteSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  codeText: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.text.primary,
    letterSpacing: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  codeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeActionText: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  codeActionDivider: {
    color: colors.border.medium,
    fontSize: 14,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text.secondary,
  },
  memberCount: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.text.muted,
  },

  // Members List — clean rows with hairline separators
  membersList: {},
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  memberRowBorder: {
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: hairline,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberInitials: {
    fontFamily: fonts.serif,
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  memberEmail: {
    ...typography.caption,
    color: colors.text.muted,
  },
  youBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
  },
  youBadgeText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text.primary,
  },
  modalSaveText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalSaveTextDisabled: {
    color: colors.text.muted,
  },
  modalBody: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  modalField: {
    marginBottom: spacing.xl,
  },
  modalLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  modalInput: {
    ...typography.body,
    color: colors.text.primary,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  modalError: {
    ...typography.caption,
    color: colors.status.error,
    marginTop: spacing.xs,
  },

  // Sign Out — understated
  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  signOutText: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 1,
  },
});
