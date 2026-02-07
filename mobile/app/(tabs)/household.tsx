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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius, typography, fonts, hairline } from '../../lib/theme';

export default function HouseholdScreen() {
  const { user, household, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const members = useQuery(
    api.households.getMembers,
    household ? { householdId: household._id } : 'skip'
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
      { bg: '#F2EDE5', text: '#8B7355' }, // Warm sand
      { bg: '#E8E4EF', text: '#6B6080' }, // Muted lavender
      { bg: '#E5ECE8', text: '#5B7365' }, // Sage
      { bg: '#EDE5E5', text: '#7B5555' }, // Dusty rose
      { bg: '#E5E8ED', text: '#556075' }, // Slate
      { bg: '#EDE8E0', text: '#756B55' }, // Taupe
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
        {/* Header — no icon circle */}
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
