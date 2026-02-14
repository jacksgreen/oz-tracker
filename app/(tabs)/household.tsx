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
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../context/AuthContext';
import { useClerk } from '@clerk/clerk-expo';
import { colors, spacing, borderRadius, typography, fonts, hairline } from '../../lib/theme';

export default function HouseholdScreen() {
  const { user, household } = useCurrentUser();
  const { signOut } = useClerk();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDogName, setEditDogName] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const updateHousehold = useMutation(api.households.update);

  const members = useQuery(
    api.households.getMembers,
    household ? {} : 'skip'
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleCopyInviteCode = async () => {
    if (!household) return;

    try {
      await Share.share({
        message: `Join my household "${household.name}" on Dog Duty! Use invite code: ${household.inviteCode}`,
      });
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      // User cancelled or error occurred
    }
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Muted editorial member colors
  const getMemberColor = (name: string) => {
    const memberColors = [
      { bg: '#F3F0EA', text: '#8A7B6B' }, // Oat
      { bg: '#EDEAEF', text: '#736880' }, // Blueberry
      { bg: '#E8EDE8', text: '#5E7A65' }, // Herb
      { bg: '#F0EAEA', text: '#7B5E5E' }, // Lingonberry
      { bg: '#E8EAED', text: '#5E6875' }, // Stone
      { bg: '#EDEBE5', text: '#756E5E' }, // Rye
    ];

    const index = name.charCodeAt(0) % memberColors.length;
    return memberColors[index];
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
        >
          <Ionicons name="settings-outline" size={20} color={colors.text.secondary} />
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
            tintColor={colors.text.primary}
          />
        }
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
          <Text style={styles.sectionTitle}>INVITE CODE</Text>
          <View style={styles.inviteRow}>
            <Text style={styles.codeText}>{household.inviteCode}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleCopyInviteCode}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'share-outline'}
                size={16}
                color={copied ? colors.status.success : colors.text.primary}
              />
              <Text style={[styles.shareButtonText, copied && styles.shareButtonTextCopied]}>
                {copied ? 'Shared' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inviteHint}>
            Share this code to add family members
          </Text>
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
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.light,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: hairline,
    borderColor: colors.text.primary,
    borderRadius: borderRadius.sm,
  },
  shareButtonText: {
    ...typography.button,
    fontSize: 12,
    color: colors.text.primary,
  },
  shareButtonTextCopied: {
    color: colors.status.success,
  },
  inviteHint: {
    ...typography.caption,
    color: colors.text.muted,
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
    backgroundColor: colors.accent.warm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.inverse,
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
    ...typography.displaySmall,
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
    paddingVertical: spacing.lg,
  },
  signOutText: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
});
