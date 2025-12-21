import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../lib/theme';

type AuthStep = 'welcome' | 'signin' | 'household-choice' | 'create-household' | 'join-household';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, createHousehold, joinHousehold, user, household } = useAuth();

  const [step, setStep] = useState<AuthStep>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [dogName, setDogName] = useState('Oz');
  const [inviteCode, setInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated with household
  React.useEffect(() => {
    if (user && household) {
      router.replace('/(tabs)');
    } else if (user && !household) {
      setStep('household-choice');
    }
  }, [user, household]);

  const handleSignIn = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await signIn(email.trim().toLowerCase(), name.trim());
      setStep('household-choice');
    } catch (e) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !dogName.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const code = await createHousehold(householdName.trim(), dogName.trim());
      setCreatedInviteCode(code);
    } catch (e) {
      setError('Failed to create household. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await joinHousehold(inviteCode.trim().toUpperCase());
    } catch (e) {
      setError('Invalid invite code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      {/* Decorative paw prints */}
      <View style={styles.pawPrintsContainer}>
        <Text style={styles.pawPrint}>🐾</Text>
        <Text style={[styles.pawPrint, styles.pawPrint2]}>🐾</Text>
        <Text style={[styles.pawPrint, styles.pawPrint3]}>🐾</Text>
      </View>

      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🐕</Text>
        </View>
      </View>

      <Text style={styles.welcomeTitle}>Oz Tracker</Text>
      <Text style={styles.welcomeSubtitle}>
        Keep track of walks, meals, and vet visits together
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('signin')}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
      </TouchableOpacity>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="footsteps" size={18} color={colors.primary[600]} />
          </View>
          <Text style={styles.featureText}>Track morning & evening walks</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="restaurant" size={18} color={colors.primary[600]} />
          </View>
          <Text style={styles.featureText}>Log meals & feeding times</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="medical" size={18} color={colors.primary[600]} />
          </View>
          <Text style={styles.featureText}>Schedule vet appointments</Text>
        </View>
      </View>
    </View>
  );

  const renderSignIn = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('welcome')}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Welcome!</Text>
      <Text style={styles.stepSubtitle}>Let's get you set up</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor={colors.text.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHouseholdChoice = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <View style={[styles.logoCircle, styles.logoCircleSmall]}>
          <Text style={styles.logoEmojiSmall}>🏠</Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>Set Up Your Household</Text>
      <Text style={styles.stepSubtitle}>
        Create a new household or join an existing one with an invite code
      </Text>

      <TouchableOpacity
        style={styles.choiceCard}
        onPress={() => setStep('create-household')}
        activeOpacity={0.8}
      >
        <View style={styles.choiceIconContainer}>
          <Ionicons name="add-circle" size={32} color={colors.primary[500]} />
        </View>
        <View style={styles.choiceContent}>
          <Text style={styles.choiceTitle}>Create New Household</Text>
          <Text style={styles.choiceDescription}>
            Start fresh and invite your partner
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.text.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.choiceCard}
        onPress={() => setStep('join-household')}
        activeOpacity={0.8}
      >
        <View style={styles.choiceIconContainer}>
          <Ionicons name="enter" size={32} color={colors.accent.warm} />
        </View>
        <View style={styles.choiceContent}>
          <Text style={styles.choiceTitle}>Join Existing Household</Text>
          <Text style={styles.choiceDescription}>
            Enter an invite code to join
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderCreateHousehold = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('household-choice')}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      {createdInviteCode ? (
        <>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.status.success} />
            </View>
            <Text style={styles.stepTitle}>You're All Set!</Text>
            <Text style={styles.stepSubtitle}>
              Share this code with your partner to join
            </Text>

            <View style={styles.inviteCodeDisplay}>
              <Text style={styles.inviteCodeLabel}>Invite Code</Text>
              <Text style={styles.inviteCodeValue}>{createdInviteCode}</Text>
            </View>

            {household ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(tabs)')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Start Tracking</Text>
                <Ionicons name="paw" size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.primaryButton, styles.buttonDisabled]}>
                <ActivityIndicator color={colors.text.inverse} size="small" />
                <Text style={styles.primaryButtonText}>Setting up...</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.stepTitle}>Create Household</Text>
          <Text style={styles.stepSubtitle}>Tell us about your home</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Household Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., The Smith Family"
              placeholderTextColor={colors.text.muted}
              value={householdName}
              onChangeText={setHouseholdName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dog's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Oz"
              placeholderTextColor={colors.text.muted}
              value={dogName}
              onChangeText={setDogName}
              autoCapitalize="words"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleCreateHousehold}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Create Household</Text>
                <Ionicons name="home" size={20} color={colors.text.inverse} />
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderJoinHousehold = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('household-choice')}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Join Household</Text>
      <Text style={styles.stepSubtitle}>
        Enter the invite code shared with you
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Invite Code</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="XXXXXX"
          placeholderTextColor={colors.text.muted}
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleJoinHousehold}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Join Household</Text>
            <Ionicons name="enter" size={20} color={colors.text.inverse} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcome();
      case 'signin':
        return renderSignIn();
      case 'household-choice':
        return renderHouseholdChoice();
      case 'create-household':
        return renderCreateHousehold();
      case 'join-household':
        return renderJoinHousehold();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  stepContainer: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Welcome screen
  pawPrintsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  pawPrint: {
    position: 'absolute',
    fontSize: 32,
    opacity: 0.15,
    top: 20,
    right: 40,
    transform: [{ rotate: '-15deg' }],
  },
  pawPrint2: {
    top: 60,
    right: 100,
    fontSize: 24,
    transform: [{ rotate: '10deg' }],
  },
  pawPrint3: {
    top: 30,
    left: 30,
    fontSize: 28,
    transform: [{ rotate: '-25deg' }],
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  logoCircleSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoEmoji: {
    fontSize: 56,
  },
  logoEmojiSmall: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  featureList: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: colors.text.secondary,
    flex: 1,
  },

  // Step screens
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },

  // Inputs
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    height: 56,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
  },

  // Buttons
  primaryButton: {
    height: 56,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Choice cards
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  choiceContent: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Success state
  successContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  inviteCodeDisplay: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    width: '100%',
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  inviteCodeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary[700],
    letterSpacing: 4,
  },

  // Error
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
