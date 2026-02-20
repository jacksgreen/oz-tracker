import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthScreen from '../index';
import { useAuth, useSSO, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useCurrentUser } from '../../../context/AuthContext';

// Typed mock helpers
const mockUseAuth = useAuth as jest.Mock;
const mockUseSSO = useSSO as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseSignUp = useSignUp as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockUseCurrentUser = useCurrentUser as jest.Mock;

// Shared mock fns that tests can configure
let mockStartSSOFlow: jest.Mock;
let mockSignInCreate: jest.Mock;
let mockSignInAttemptFirstFactor: jest.Mock;
let mockSetSignInActive: jest.Mock;
let mockSignUpCreate: jest.Mock;
let mockSignUpPrepare: jest.Mock;
let mockSignUpAttempt: jest.Mock;
let mockSetSignUpActive: jest.Mock;
let mockCreateHousehold: jest.Mock;
let mockJoinHousehold: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockStartSSOFlow = jest.fn();
  mockSignInCreate = jest.fn();
  mockSignInAttemptFirstFactor = jest.fn();
  mockSetSignInActive = jest.fn();
  mockSignUpCreate = jest.fn();
  mockSignUpPrepare = jest.fn();
  mockSignUpAttempt = jest.fn();
  mockSetSignUpActive = jest.fn();
  mockCreateHousehold = jest.fn();
  mockJoinHousehold = jest.fn();

  mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
  mockUseSSO.mockReturnValue({ startSSOFlow: mockStartSSOFlow });
  mockUseSignIn.mockReturnValue({
    signIn: { create: mockSignInCreate, attemptFirstFactor: mockSignInAttemptFirstFactor },
    setActive: mockSetSignInActive,
    isLoaded: true,
  });
  mockUseSignUp.mockReturnValue({
    signUp: {
      create: mockSignUpCreate,
      prepareEmailAddressVerification: mockSignUpPrepare,
      attemptEmailAddressVerification: mockSignUpAttempt,
    },
    setActive: mockSetSignUpActive,
    isLoaded: true,
  });
  mockUseCurrentUser.mockReturnValue({ user: null, household: null, isLoaded: true });
  mockUseMutation.mockImplementation(() => {
    // Return the correct mock based on call order:
    // 1st call = createHouseholdMutation, 2nd = joinHouseholdMutation
    return jest.fn();
  });
  // Override to return specific mocks per mutation key
  mockUseMutation.mockImplementation((key: string) => {
    if (key === 'households:create') return mockCreateHousehold;
    if (key === 'households:join') return mockJoinHousehold;
    return jest.fn();
  });
  mockUseQuery.mockReturnValue(undefined);
});

// ─── Welcome Screen ─────────────────────────────────────────────

describe('Welcome screen', () => {
  it('renders welcome title and GET STARTED button', () => {
    const { getByText } = render(<AuthScreen />);
    expect(getByText('Dog Duty')).toBeTruthy();
    expect(getByText('GET STARTED')).toBeTruthy();
  });

  it('tapping GET STARTED navigates to sign-in step', () => {
    const { getByText, queryByText } = render(<AuthScreen />);
    fireEvent.press(getByText('GET STARTED'));
    // Sign-in step shows "Sign in to get started"
    expect(getByText('Sign in to get started')).toBeTruthy();
    // Welcome title should no longer be visible
    expect(queryByText('Share the work of caring for your dog')).toBeNull();
  });
});

// ─── Sign-in Screen ─────────────────────────────────────────────

describe('Sign-in screen', () => {
  const goToSignIn = () => {
    const result = render(<AuthScreen />);
    fireEvent.press(result.getByText('GET STARTED'));
    return result;
  };

  it('shows CONTINUE WITH GOOGLE and CONTINUE WITH EMAIL', () => {
    const { getByText } = goToSignIn();
    expect(getByText('CONTINUE WITH GOOGLE')).toBeTruthy();
    expect(getByText('CONTINUE WITH EMAIL')).toBeTruthy();
  });

  it('tapping back arrow returns to welcome', () => {
    const { getByText } = goToSignIn();
    // The back button contains the "arrow-back" icon text (from our mock)
    fireEvent.press(getByText('arrow-back'));
    expect(getByText('Dog Duty')).toBeTruthy();
  });

  it('tapping CONTINUE WITH EMAIL navigates to email form', () => {
    const { getByText } = goToSignIn();
    fireEvent.press(getByText('CONTINUE WITH EMAIL'));
    expect(getByText('Enter your email and password')).toBeTruthy();
  });

  it('tapping Google calls startSSOFlow with oauth_google', async () => {
    mockStartSSOFlow.mockResolvedValue({ createdSessionId: null, setActive: jest.fn() });
    const { getByText } = goToSignIn();
    fireEvent.press(getByText('CONTINUE WITH GOOGLE'));
    await waitFor(() => {
      expect(mockStartSSOFlow).toHaveBeenCalledWith(
        expect.objectContaining({ strategy: 'oauth_google' })
      );
    });
  });

  it('shows error on SSO failure', async () => {
    mockStartSSOFlow.mockRejectedValue(new Error('SSO failed'));
    const { getByText } = goToSignIn();
    fireEvent.press(getByText('CONTINUE WITH GOOGLE'));
    await waitFor(() => {
      expect(getByText('Failed to sign in with Google. Please try again.')).toBeTruthy();
    });
  });
});

// ─── Email Form Screen ──────────────────────────────────────────

describe('Email form screen', () => {
  const goToEmailForm = () => {
    const result = render(<AuthScreen />);
    fireEvent.press(result.getByText('GET STARTED'));
    fireEvent.press(result.getByText('CONTINUE WITH EMAIL'));
    return result;
  };

  it('shows email and password fields and SIGN IN button', () => {
    const { getByPlaceholderText, getByText } = goToEmailForm();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Your password')).toBeTruthy();
    expect(getByText('SIGN IN')).toBeTruthy();
  });

  it('tapping back returns to sign-in screen', () => {
    const { getByText, getAllByText } = goToEmailForm();
    // There may be multiple arrow-back texts; press the first one (the back button)
    fireEvent.press(getAllByText('arrow-back')[0]);
    expect(getByText('Sign in to get started')).toBeTruthy();
  });

  it('shows validation error when submitting empty fields', () => {
    const { getByText } = goToEmailForm();
    fireEvent.press(getByText('SIGN IN'));
    expect(getByText('Please enter your email and password')).toBeTruthy();
  });

  it('calls signIn.create with identifier then attemptFirstFactor with password', async () => {
    mockSignInCreate.mockResolvedValue({ status: 'needs_first_factor' });
    mockSignInAttemptFirstFactor.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_123' });
    mockSetSignInActive.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('SIGN IN'));

    await waitFor(() => {
      expect(mockSignInCreate).toHaveBeenCalledWith({
        identifier: 'test@example.com',
      });
      expect(mockSignInAttemptFirstFactor).toHaveBeenCalledWith({
        strategy: 'password',
        password: 'password123',
      });
    });
  });

  it('sets active session on successful two-step sign-in', async () => {
    mockSignInCreate.mockResolvedValue({ status: 'needs_first_factor' });
    mockSignInAttemptFirstFactor.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_123' });
    mockSetSignInActive.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('SIGN IN'));

    await waitFor(() => {
      expect(mockSetSignInActive).toHaveBeenCalledWith({ session: 'sess_123' });
    });
  });

  it('sets active session when signIn.create completes directly', async () => {
    mockSignInCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_direct' });
    mockSetSignInActive.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('SIGN IN'));

    await waitFor(() => {
      expect(mockSetSignInActive).toHaveBeenCalledWith({ session: 'sess_direct' });
      expect(mockSignInAttemptFirstFactor).not.toHaveBeenCalled();
    });
  });

  it('shows error when sign-in result is not complete', async () => {
    mockSignInCreate.mockResolvedValue({ status: 'needs_second_factor', createdSessionId: null });

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('SIGN IN'));

    await waitFor(() => {
      expect(getByText('Sign in could not be completed. Please try again.')).toBeTruthy();
    });
  });

  it('shows Clerk error message on sign-in failure', async () => {
    mockSignInCreate.mockRejectedValue({
      errors: [{ longMessage: 'Invalid password' }],
    });

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'wrong');
    fireEvent.press(getByText('SIGN IN'));

    await waitFor(() => {
      expect(getByText('Invalid password')).toBeTruthy();
    });
  });

  it('toggles to Create Account mode', () => {
    const { getByText } = goToEmailForm();
    fireEvent.press(getByText('Create one'));
    expect(getByText('CREATE ACCOUNT')).toBeTruthy();
    expect(getByText('Enter your details to get started')).toBeTruthy();
  });

  it('calls signUp.create + prepareEmailAddressVerification on sign-up', async () => {
    mockSignUpCreate.mockResolvedValue(undefined);
    mockSignUpPrepare.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = goToEmailForm();
    // Switch to sign-up mode
    fireEvent.press(getByText('Create one'));
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password'), 'newpass123');
    fireEvent.press(getByText('CREATE ACCOUNT'));

    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalledWith({
        emailAddress: 'new@example.com',
        password: 'newpass123',
      });
      expect(mockSignUpPrepare).toHaveBeenCalledWith({ strategy: 'email_code' });
    });
  });

  it('navigates to verify step after successful sign-up', async () => {
    mockSignUpCreate.mockResolvedValue(undefined);
    mockSignUpPrepare.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = goToEmailForm();
    fireEvent.press(getByText('Create one'));
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a password'), 'newpass123');
    fireEvent.press(getByText('CREATE ACCOUNT'));

    await waitFor(() => {
      expect(getByText('Check Your Email')).toBeTruthy();
    });
  });
});

// ─── Email Verify Screen ────────────────────────────────────────

describe('Email verify screen', () => {
  const goToVerify = async () => {
    mockSignUpCreate.mockResolvedValue(undefined);
    mockSignUpPrepare.mockResolvedValue(undefined);

    const result = render(<AuthScreen />);
    fireEvent.press(result.getByText('GET STARTED'));
    fireEvent.press(result.getByText('CONTINUE WITH EMAIL'));
    fireEvent.press(result.getByText('Create one'));
    fireEvent.changeText(result.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.changeText(result.getByPlaceholderText('Create a password'), 'pass123');
    fireEvent.press(result.getByText('CREATE ACCOUNT'));
    await waitFor(() => {
      expect(result.getByText('Check Your Email')).toBeTruthy();
    });
    return result;
  };

  it('shows Check Your Email title and user email', async () => {
    const { getByText } = await goToVerify();
    expect(getByText('Check Your Email')).toBeTruthy();
    expect(getByText('user@test.com')).toBeTruthy();
  });

  it('tapping back returns to email form', async () => {
    const { getByText, getAllByText } = await goToVerify();
    fireEvent.press(getAllByText('arrow-back')[0]);
    // Should be back at email form (Create Account mode)
    expect(getByText('Create Account')).toBeTruthy();
  });

  it('shows validation error for empty code', async () => {
    const { getByText } = await goToVerify();
    fireEvent.press(getByText('VERIFY'));
    expect(getByText('Please enter the verification code')).toBeTruthy();
  });

  it('calls attemptEmailAddressVerification with the code', async () => {
    mockSignUpAttempt.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_456' });
    mockSetSignUpActive.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = await goToVerify();
    fireEvent.changeText(getByPlaceholderText('••••••'), '123456');
    fireEvent.press(getByText('VERIFY'));

    await waitFor(() => {
      expect(mockSignUpAttempt).toHaveBeenCalledWith({ code: '123456' });
    });
  });

  it('sets active session on successful verification', async () => {
    mockSignUpAttempt.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_456' });
    mockSetSignUpActive.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = await goToVerify();
    fireEvent.changeText(getByPlaceholderText('••••••'), '123456');
    fireEvent.press(getByText('VERIFY'));

    await waitFor(() => {
      expect(mockSetSignUpActive).toHaveBeenCalledWith({ session: 'sess_456' });
    });
  });

  it('shows error when verification result is not complete', async () => {
    mockSignUpAttempt.mockResolvedValue({ status: 'missing_requirements', createdSessionId: null });

    const { getByPlaceholderText, getByText } = await goToVerify();
    fireEvent.changeText(getByPlaceholderText('••••••'), '123456');
    fireEvent.press(getByText('VERIFY'));

    await waitFor(() => {
      expect(getByText('Verification could not be completed. Please try again.')).toBeTruthy();
    });
  });

  it('shows error on invalid code', async () => {
    mockSignUpAttempt.mockRejectedValue({
      errors: [{ longMessage: 'Incorrect code' }],
    });

    const { getByPlaceholderText, getByText } = await goToVerify();
    fireEvent.changeText(getByPlaceholderText('••••••'), '000000');
    fireEvent.press(getByText('VERIFY'));

    await waitFor(() => {
      expect(getByText('Incorrect code')).toBeTruthy();
    });
  });
});

// ─── Household Choice Screen ────────────────────────────────────

describe('Household choice screen', () => {
  const renderWithSignedInUser = () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    mockUseCurrentUser.mockReturnValue({
      user: { _id: 'user1', name: 'Test', email: 'test@test.com' },
      household: null,
      isLoaded: true,
    });
    return render(<AuthScreen />);
  };

  it('shows Add Your Dog and Join Existing Dog options', () => {
    const { getByText } = renderWithSignedInUser();
    expect(getByText('Add Your Dog')).toBeTruthy();
    expect(getByText('Join Existing Dog')).toBeTruthy();
  });
});

// ─── Create Household Flow ──────────────────────────────────────

describe('Create household flow', () => {
  const goToCreateHousehold = () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    mockUseCurrentUser.mockReturnValue({
      user: { _id: 'user1', name: 'Test', email: 'test@test.com' },
      household: null,
      isLoaded: true,
    });
    const result = render(<AuthScreen />);
    fireEvent.press(result.getByText('Add Your Dog'));
    return result;
  };

  it('shows dog name input', () => {
    const { getByPlaceholderText, getByText } = goToCreateHousehold();
    expect(getByText("What's your dog's name?")).toBeTruthy();
    expect(getByPlaceholderText("Your dog's name")).toBeTruthy();
  });

  it('validates empty dog name', () => {
    const { getByText } = goToCreateHousehold();
    fireEvent.press(getByText('CONTINUE'));
    expect(getByText("Please enter your dog's name")).toBeTruthy();
  });

  it('calls createHouseholdMutation and shows invite code on success', async () => {
    mockCreateHousehold.mockResolvedValue({ inviteCode: 'ABC123' });

    const { getByPlaceholderText, getByText } = goToCreateHousehold();
    fireEvent.changeText(getByPlaceholderText("Your dog's name"), 'Buddy');
    fireEvent.press(getByText('CONTINUE'));

    await waitFor(() => {
      expect(mockCreateHousehold).toHaveBeenCalledWith({ dogName: 'Buddy' });
      expect(getByText('ABC123')).toBeTruthy();
      expect(getByText("You're All Set")).toBeTruthy();
    });
  });
});

// ─── Join Household Flow ────────────────────────────────────────

describe('Join household flow', () => {
  const goToJoinHousehold = () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    mockUseCurrentUser.mockReturnValue({
      user: { _id: 'user1', name: 'Test', email: 'test@test.com' },
      household: null,
      isLoaded: true,
    });
    const result = render(<AuthScreen />);
    fireEvent.press(result.getByText('Join Existing Dog'));
    return result;
  };

  it('shows invite code input', () => {
    const { getByPlaceholderText, getByText } = goToJoinHousehold();
    expect(getByText('Enter the invite code shared with you')).toBeTruthy();
    expect(getByPlaceholderText('XXXXXX')).toBeTruthy();
  });

  it('validates empty invite code', () => {
    const { getByText } = goToJoinHousehold();
    fireEvent.press(getByText('CONTINUE'));
    expect(getByText('Please enter an invite code')).toBeTruthy();
  });

  it('navigates to confirm-join step with uppercased code', () => {
    const { getByPlaceholderText, getByText } = goToJoinHousehold();
    fireEvent.changeText(getByPlaceholderText('XXXXXX'), 'abc123');
    fireEvent.press(getByText('CONTINUE'));
    // Should show the Confirm screen
    expect(getByText('Confirm')).toBeTruthy();
  });
});
