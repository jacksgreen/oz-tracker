import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Share,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSSO, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser, useStoreUser } from '../../context/AuthContext';
import { colors, spacing, borderRadius, typography, fonts, hairline } from '../../lib/theme';
import { ProgressDots } from '../../components/ProgressDots';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

type AuthStep = 'welcome' | 'signin' | 'email-form' | 'email-verify' | 'household-choice' | 'create-household' | 'join-household' | 'confirm-join';

export default function AuthScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  useStoreUser();
  const { user, household } = useCurrentUser();

  const createHouseholdMutation = useMutation(api.households.create);
  const joinHouseholdMutation = useMutation(api.households.join);

  const [step, setStep] = useState<AuthStep>('welcome');
  const [dogName, setDogName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [confirmedCode, setConfirmedCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'oauth_google' | 'oauth_apple' | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailSignUp, setIsEmailSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const lookedUpHousehold = useQuery(
    api.households.getByInviteCode,
    confirmedCode ? { inviteCode: confirmedCode } : 'skip'
  );

  // Redirect if already authenticated with household
  React.useEffect(() => {
    if (isSignedIn && user && household) {
      router.replace('/');
    } else if (isSignedIn && user && !household) {
      setStep('household-choice');
    } else if (!isSignedIn) {
      setStep('welcome');
    }
  }, [isSignedIn, user, household]);

  const handleSSOSignIn = useCallback(async (strategy: 'oauth_google' | 'oauth_apple') => {
    setIsLoading(true);
    setLoadingProvider(strategy);
    setError('');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: Linking.createURL('/(tabs)'),
      });

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
      }
    } catch (e) {
      const provider = strategy === 'oauth_google' ? 'Google' : 'Apple';
      setError(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  }, [startSSOFlow]);

  const handleEmailSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    if (!isSignInLoaded || !signIn) {
      setError('Still loading. Please try again.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signIn.create({
        identifier: email.trim(),
      });

      if (result.status === 'needs_first_factor') {
        const firstFactor = await signIn.attemptFirstFactor({
          strategy: 'password',
          password: password.trim(),
        });
        if (firstFactor.status === 'complete' && firstFactor.createdSessionId) {
          await setSignInActive!({ session: firstFactor.createdSessionId });
        } else {
          setError('Sign in could not be completed. Please try again.');
        }
      } else if (result.status === 'complete' && result.createdSessionId) {
        await setSignInActive!({ session: result.createdSessionId });
      } else {
        setError('Sign in could not be completed. Please try again.');
      }
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message;
      if (msg) {
        setError(msg);
      } else {
        setError('Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn, setSignInActive, isSignInLoaded]);

  const handleEmailSignUp = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    if (!isSignUpLoaded || !signUp) {
      setError('Still loading. Please try again.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('email-verify');
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message;
      if (msg) {
        setError(msg);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signUp, isSignUpLoaded]);

  const handleVerifyEmail = useCallback(async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }
    if (!isSignUpLoaded || !signUp) {
      setError('Still loading. Please try again.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setSignUpActive!({ session: result.createdSessionId });
      } else {
        setError('Verification could not be completed. Please try again.');
      }
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message;
      if (msg) {
        setError(msg);
      } else {
        setError('Invalid code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, signUp, setSignUpActive, isSignUpLoaded]);

  const handleCreateHousehold = async () => {
    if (!dogName.trim()) {
      setError("Please enter your dog's name");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await createHouseholdMutation({
        dogName: dogName.trim(),
      });
      setCreatedInviteCode(result.inviteCode);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupHousehold = () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setError('');
    setConfirmedCode(inviteCode.trim().toUpperCase());
    setStep('confirm-join');
  };

  const handleConfirmJoin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await joinHouseholdMutation({
        inviteCode: confirmedCode,
      });
    } catch (e) {
      setError('Failed to join. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fade animation for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef(step);

  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [step, fadeAnim]);

  const [codeCopied, setCodeCopied] = useState(false);

  const handleShareCreatedCode = async () => {
    try {
      await Share.share({
        message: `Join me on Dog Duty! Use invite code: ${createdInviteCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyCreatedCode = async () => {
    await Clipboard.setStringAsync(createdInviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeTitle}>Dog Duty</Text>
        <Text style={styles.welcomeSubtitle}>
          Share the work of caring for your dog
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Ionicons name="people-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.featureText}>Never wonder if the dog's been walked</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.featureText}>Everyone knows whose turn it is, every day</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="heart-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.featureText}>Nothing falls through the cracks</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('signin')}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>GET STARTED</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );

  const renderSignIn = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('welcome')}>
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Welcome</Text>
      <Text style={styles.stepSubtitle}>Sign in to get started</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={() => handleSSOSignIn('oauth_apple')}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {loadingProvider === 'oauth_apple' ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color={colors.text.inverse} />
              <Text style={styles.primaryButtonText}>CONTINUE WITH APPLE</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
        onPress={() => handleSSOSignIn('oauth_google')}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {loadingProvider === 'oauth_google' ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.text.primary} />
            <Text style={styles.secondaryButtonText}>CONTINUE WITH GOOGLE</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
        onPress={() => {
          setError('');
          setStep('email-form');
        }}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="mail-outline" size={18} color={colors.text.primary} />
        <Text style={styles.secondaryButtonText}>CONTINUE WITH EMAIL</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailForm = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setStep('signin');
          setError('');
        }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>
        {isEmailSignUp ? 'Create Account' : 'Sign In'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {isEmailSignUp ? 'Enter your details to get started' : 'Enter your email and password'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.text.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PASSWORD</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder={isEmailSignUp ? 'Create a password' : 'Your password'}
            placeholderTextColor={colors.text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={isEmailSignUp ? 'new-password' : 'current-password'}
            textContentType={isEmailSignUp ? 'newPassword' : 'password'}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.text.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={isEmailSignUp ? handleEmailSignUp : handleEmailSignIn}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {isEmailSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleAuthMode}
        onPress={() => {
          setIsEmailSignUp(!isEmailSignUp);
          setError('');
        }}
        activeOpacity={0.6}
      >
        <Text style={styles.toggleAuthText}>
          {isEmailSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <Text style={styles.toggleAuthAction}>
            {isEmailSignUp ? 'Sign in' : 'Create one'}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailVerify = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setStep('email-form');
          setVerificationCode('');
          setError('');
        }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Check Your Email</Text>
      <Text style={styles.stepSubtitle}>
        We sent a verification code to{'\n'}
        <Text style={{ fontWeight: '500', color: colors.text.primary }}>{email}</Text>
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="••••••"
          placeholderTextColor={colors.text.muted}
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          editable={!isLoading}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyEmail}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>VERIFY</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHouseholdChoice = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Get Started</Text>
      <Text style={styles.stepSubtitle}>
        Set up a new dog or join an existing one with an invite code
      </Text>

      <TouchableOpacity
        style={styles.choiceCard}
        onPress={() => setStep('create-household')}
        activeOpacity={0.8}
      >
        <View style={styles.choiceContent}>
          <Text style={styles.choiceTitle}>Add Your Dog</Text>
          <Text style={styles.choiceDescription}>
            Start fresh and invite your family
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.choiceCard}
        onPress={() => setStep('join-household')}
        activeOpacity={0.8}
      >
        <View style={styles.choiceContent}>
          <Text style={styles.choiceTitle}>Join Existing Dog</Text>
          <Text style={styles.choiceDescription}>
            Enter an invite code to join
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderCreateHousehold = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('household-choice')}>
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      {createdInviteCode ? (
        <>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={28} color={colors.status.success} />
            </View>
            <Text style={styles.stepTitle}>You're All Set</Text>
            <Text style={styles.stepSubtitle}>
              Share this code with your partner to join
            </Text>

            <View style={styles.inviteCodeDisplay}>
              <Text style={styles.inviteCodeLabel}>INVITE CODE</Text>
              <Text style={styles.inviteCodeValue}>{createdInviteCode}</Text>
            </View>

            <View style={styles.codeActionRow}>
              <TouchableOpacity
                style={styles.codeAction}
                onPress={handleCopyCreatedCode}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={codeCopied ? 'checkmark' : 'copy-outline'}
                  size={13}
                  color={codeCopied ? colors.status.success : colors.text.muted}
                />
                <Text style={[styles.codeActionLabel, codeCopied && { color: colors.status.success }]}>
                  {codeCopied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.codeActionDivider}>{'\u00B7'}</Text>
              <TouchableOpacity
                style={styles.codeAction}
                onPress={handleShareCreatedCode}
                activeOpacity={0.6}
              >
                <Ionicons name="share-outline" size={13} color={colors.text.muted} />
                <Text style={styles.codeActionLabel}>Share</Text>
              </TouchableOpacity>
            </View>

            {household ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>START TRACKING</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
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
          <Text style={styles.stepTitle}>Add Your Dog</Text>
          <Text style={styles.stepSubtitle}>What's your dog's name?</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DOG'S NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Your dog's name"
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
                <Text style={styles.primaryButtonText}>CONTINUE</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
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
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Join a Dog</Text>
      <Text style={styles.stepSubtitle}>
        Enter the invite code shared with you
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>INVITE CODE</Text>
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
        style={styles.primaryButton}
        onPress={handleLookupHousehold}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );

  const renderConfirmJoin = () => {
    const isLookupLoading = confirmedCode && lookedUpHousehold === undefined;
    const notFound = confirmedCode && lookedUpHousehold === null;

    return (
      <View style={styles.stepContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          setStep('join-household');
          setConfirmedCode('');
          setError('');
        }}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.stepTitle}>Confirm</Text>

        {isLookupLoading ? (
          <View style={styles.confirmLoadingContainer}>
            <ActivityIndicator size="small" color={colors.text.muted} />
            <Text style={styles.stepSubtitle}>Looking up invite code...</Text>
          </View>
        ) : notFound ? (
          <>
            <Text style={styles.stepSubtitle}>
              No dog found for code "{confirmedCode}". Please check and try again.
            </Text>
          </>
        ) : lookedUpHousehold?.expired ? (
          <>
            <Text style={styles.stepSubtitle}>
              This invite code has expired. Ask a household member to reset it and share a new one.
            </Text>
          </>
        ) : lookedUpHousehold ? (
          <>
            <Text style={styles.stepSubtitle}>
              You're about to join:
            </Text>

            <View style={styles.confirmCard}>
              <Ionicons name="home-outline" size={22} color={colors.text.primary} />
              <Text style={styles.confirmHouseholdName}>{lookedUpHousehold.dogName}</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleConfirmJoin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>JOIN</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };

  const dotConfig: Record<AuthStep, number | null> = {
    'welcome': null,
    'signin': 0,
    'email-form': 0,
    'email-verify': 0,
    'household-choice': 1,
    'create-household': 2,
    'join-household': 2,
    'confirm-join': 2,
  };

  const renderStep = () => {
    const content = (() => {
      switch (step) {
        case 'welcome':
          return renderWelcome();
        case 'signin':
          return renderSignIn();
        case 'email-form':
          return renderEmailForm();
        case 'email-verify':
          return renderEmailVerify();
        case 'household-choice':
          return renderHouseholdChoice();
        case 'create-household':
          return renderCreateHousehold();
        case 'join-household':
          return renderJoinHousehold();
        case 'confirm-join':
          return renderConfirmJoin();
      }
    })();

    const activeDot = dotConfig[step];

    return (
      <>
        {activeDot !== null && <ProgressDots total={3} activeIndex={activeDot} />}
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {content}
        </Animated.View>
      </>
    );
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
    paddingTop: 80,
    paddingBottom: spacing.xxl,
  },
  stepContainer: {
    flex: 1,
  },
  backButton: {
    marginBottom: spacing.xl,
  },

  // Welcome screen
  welcomeHeader: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontFamily: fonts.serif,
    fontSize: 44,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    ...typography.displayItalic,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  featureList: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Step screens
  stepTitle: {
    ...typography.displayMedium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },

  // Inputs
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'transparent',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
  },

  // Buttons
  primaryButton: {
    height: 52,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  secondaryButton: {
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Password field
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    padding: spacing.sm,
    marginBottom: -spacing.xs,
  },

  // Auth mode toggle
  toggleAuthMode: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toggleAuthText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  toggleAuthAction: {
    fontWeight: '500',
    color: colors.text.primary,
  },

  // Choice cards
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: hairline,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
  },
  choiceContent: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  choiceDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Success state
  successContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: hairline,
    borderColor: colors.status.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inviteCodeDisplay: {
    alignItems: 'center',
    marginVertical: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    width: '100%',
  },
  inviteCodeLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inviteCodeValue: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.text.primary,
    letterSpacing: 4,
  },

  // Code actions (post-creation)
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  codeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeActionLabel: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  codeActionDivider: {
    color: colors.border.medium,
    fontSize: 14,
  },

  // Confirm join
  confirmLoadingContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  confirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: hairline,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  confirmHouseholdName: {
    ...typography.displayMedium,
    color: colors.text.primary,
    flex: 1,
  },

  // Error
  errorText: {
    ...typography.bodySmall,
    color: colors.status.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
