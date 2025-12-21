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
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';

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
        message: `Join my household "${household.name}" on Oz Tracker! Use invite code: ${household.inviteCode}`,
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

  // Generate a consistent color for each member based on their name
  const getMemberColor = (name: string) => {
    const memberColors = [
      { bg: '#FEF3C7', text: '#D97706' }, // Amber
      { bg: '#E0E7FF', text: '#4F46E5' }, // Indigo
      { bg: '#FCE7F3', text: '#DB2777' }, // Pink
      { bg: '#D1FAE5', text: '#059669' }, // Emerald
      { bg: '#FEE2E2', text: '#DC2626' }, // Red
      { bg: '#E0F2FE', text: '#0284C7' }, // Sky
    ];

    const index = name.charCodeAt(0) % memberColors.length;
    return memberColors[index];
  };

  // Loading states: undefined === loading, null === empty
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
          <View style={styles.headerIcon}>
            <Ionicons name="home" size={32} color={colors.primary[600]} />
          </View>
          <Text style={styles.householdName}>{household.name}</Text>
          <Text style={styles.headerSubtitle}>
            Taking care of {household.dogName} together
          </Text>
        </View>

        {/* Invite Code Card */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View style={styles.inviteIconContainer}>
              <Ionicons name="link" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.inviteTextContainer}>
              <Text style={styles.inviteTitle}>Invite Code</Text>
              <Text style={styles.inviteSubtitle}>
                Share this code to add family members
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.codeContainer}
            onPress={handleCopyInviteCode}
            activeOpacity={0.8}
          >
            <Text style={styles.codeText}>{household.inviteCode}</Text>
            <View style={[styles.copyButton, copied && styles.copyButtonCopied]}>
              <Ionicons
                name={copied ? 'checkmark' : 'share-outline'}
                size={18}
                color={copied ? colors.status.success : colors.primary[600]}
              />
              <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                {copied ? 'Shared!' : 'Share'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.memberCount}>
              <Text style={styles.memberCountText}>{members?.length || 0}</Text>
            </View>
          </View>

          {isMembersLoading ? (
            <View style={styles.membersLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[400]} />
            </View>
          ) : (
            <View style={styles.membersList}>
              {members?.map((member) => {
                const isCurrentUser = member._id === user?._id;
                const memberColor = getMemberColor(member.name);

                return (
                  <View
                    key={member._id}
                    style={[
                      styles.memberCard,
                      isCurrentUser && styles.memberCardCurrent,
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

        {/* How to Add Members Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="people" size={20} color={colors.primary[600]} />
            <Text style={styles.infoTitle}>Adding Members</Text>
          </View>
          <Text style={styles.infoText}>
            Share your invite code with family members. They can join by entering the code when they sign up or from their settings.
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text.secondary,
  },
  membersLoadingContainer: {
    height: 120,
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
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  householdName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Invite Card
  inviteCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    ...shadows.sm,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inviteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingLeft: spacing.lg,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[700],
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  copyButtonCopied: {
    backgroundColor: colors.status.successBg,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  copyButtonTextCopied: {
    color: colors.status.success,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  memberCount: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  memberCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[700],
  },

  // Members List
  membersList: {
    gap: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  memberCardCurrent: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: colors.text.muted,
  },
  youBadge: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.accent.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
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

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.status.error,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.status.error,
  },
});
