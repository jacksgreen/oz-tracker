import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, fonts } from '../../lib/theme';
import { ProgressDots } from '../../components/ProgressDots';
import { useFirstRun } from '../../lib/useFirstRun';
import { requestNotificationPermissions } from '../../lib/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SCREENS = [
  {
    icon: 'sunny' as const,
    title: "Your dog's day, organized",
    body: "Each day has a morning and evening shift. Tap a shift card to mark it done — everyone sees it instantly.",
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Take turns, fairly',
    body: "Head to the Schedule tab to assign shifts for the week. Everyone can see who's on duty at a glance.",
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Never miss what matters',
    body: "Get a nudge when it's your shift, when a vet visit is tomorrow, or when flea meds are due.",
  },
];

export default function WalkthroughScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { markComplete } = useFirstRun();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleFinish = async () => {
    await markComplete();
    router.replace('/');
  };

  const handleSkip = async () => {
    await markComplete();
    router.replace('/');
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      setNotificationsEnabled(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} hitSlop={16}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SCREENS.map((screen, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.iconBadge}>
              <Ionicons name={screen.icon} size={32} color={colors.accent.warm} />
            </View>

            <Text style={styles.title}>{screen.title}</Text>
            <Text style={styles.body}>{screen.body}</Text>

            {index === 2 && (
              <View style={styles.lastScreenActions}>
                <TouchableOpacity
                  style={[styles.notificationButton, notificationsEnabled && styles.notificationButtonEnabled]}
                  onPress={handleEnableNotifications}
                  activeOpacity={0.8}
                  disabled={notificationsEnabled}
                >
                  <Ionicons
                    name={notificationsEnabled ? 'checkmark-circle' : 'notifications-outline'}
                    size={18}
                    color={notificationsEnabled ? colors.accent.warm : colors.text.inverse}
                  />
                  <Text style={[styles.notificationButtonText, notificationsEnabled && styles.notificationButtonTextEnabled]}>
                    {notificationsEnabled ? 'NOTIFICATIONS ENABLED' : 'ENABLE NOTIFICATIONS'}
                  </Text>
                </TouchableOpacity>

                {!notificationsEnabled && (
                  <TouchableOpacity onPress={handleFinish} hitSlop={8}>
                    <Text style={styles.notNowText}>Not now</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleFinish}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>LET'S GO</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <ProgressDots total={3} activeIndex={activeIndex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  skipText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  lastScreenActions: {
    marginTop: spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  notificationButton: {
    height: 52,
    backgroundColor: colors.accent.warm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  notificationButtonEnabled: {
    backgroundColor: colors.accent.light,
  },
  notificationButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  notificationButtonTextEnabled: {
    color: colors.accent.warm,
  },
  notNowText: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  footer: {
    paddingBottom: 50,
  },
});
