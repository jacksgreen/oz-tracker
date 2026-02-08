import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useStoreUser, useCurrentUser } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  useStoreUser();
  const { user, household, isLoading } = useCurrentUser();

  if (!isLoaded || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  if (!isSignedIn || !user || !household) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
