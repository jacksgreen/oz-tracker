// Mock @clerk/clerk-expo
const mockStartSSOFlow = jest.fn();
const mockSignInCreate = jest.fn();
const mockSignUpCreate = jest.fn();
const mockSignUpPrepareEmailAddressVerification = jest.fn();
const mockSignUpAttemptEmailAddressVerification = jest.fn();
const mockSetSignInActive = jest.fn();
const mockSetSignUpActive = jest.fn();

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
  })),
  useSSO: jest.fn(() => ({
    startSSOFlow: mockStartSSOFlow,
  })),
  useSignIn: jest.fn(() => ({
    signIn: { create: mockSignInCreate },
    setActive: mockSetSignInActive,
    isLoaded: true,
  })),
  useSignUp: jest.fn(() => ({
    signUp: {
      create: mockSignUpCreate,
      prepareEmailAddressVerification: mockSignUpPrepareEmailAddressVerification,
      attemptEmailAddressVerification: mockSignUpAttemptEmailAddressVerification,
    },
    setActive: mockSetSignUpActive,
    isLoaded: true,
  })),
}));

// Mock convex/react
const mockUseMutation = jest.fn(() => jest.fn());
const mockUseQuery = jest.fn(() => undefined);

jest.mock('convex/react', () => ({
  useMutation: mockUseMutation,
  useQuery: mockUseQuery,
}));

// Mock expo-router
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: mockRouterReplace,
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://test/${path}`),
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// Mock AuthContext
jest.mock('./context/AuthContext', () => ({
  useCurrentUser: jest.fn(() => ({
    user: null,
    household: null,
    isLoaded: true,
  })),
  useStoreUser: jest.fn(),
}));

// Mock convex API
jest.mock('./convex/_generated/api', () => ({
  api: {
    households: {
      create: 'households:create',
      join: 'households:join',
      get: 'households:get',
      getByInviteCode: 'households:getByInviteCode',
    },
    users: {
      store: 'users:store',
      get: 'users:get',
    },
  },
}));

// Mock ProgressDots
jest.mock('./components/ProgressDots', () => ({
  ProgressDots: ({ total, activeIndex }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="progress-dots">
        <Text>{`${activeIndex + 1}/${total}`}</Text>
      </View>
    );
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => <Text>{name}</Text>,
  };
});
