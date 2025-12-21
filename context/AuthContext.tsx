import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  householdId?: Id<"households">;
}

interface Household {
  _id: Id<"households">;
  name: string;
  dogName: string;
  inviteCode: string;
}

interface AuthContextType {
  user: User | null;
  household: Household | null;
  isLoading: boolean;
  signIn: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  createHousehold: (name: string, dogName: string) => Promise<string>;
  joinHousehold: (inviteCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@oz_tracker_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const user = useQuery(
    api.users.getByEmail,
    userEmail ? { email: userEmail } : "skip"
  );

  const household = useQuery(
    api.households.get,
    user?.householdId ? { householdId: user.householdId } : "skip"
  );

  const createUser = useMutation(api.users.create);
  const createHouseholdMutation = useMutation(api.households.create);
  const joinHouseholdMutation = useMutation(api.households.join);

  useEffect(() => {
    loadStoredUser();
  }, []);

  async function loadStoredUser() {
    try {
      const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const { email } = JSON.parse(stored);
        setUserEmail(email);
      }
    } catch (error) {
      console.error("Failed to load stored user:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, name: string) {
    await createUser({ email, name });
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ email }));
    setUserEmail(email);
  }

  async function signOut() {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUserEmail(null);
  }

  async function createHousehold(name: string, dogName: string): Promise<string> {
    if (!user) throw new Error("Must be signed in");

    const result = await createHouseholdMutation({
      name,
      dogName,
      userName: user.name,
      userEmail: user.email,
    });

    return result.inviteCode;
  }

  async function joinHousehold(inviteCode: string) {
    if (!user) throw new Error("Must be signed in");

    await joinHouseholdMutation({
      inviteCode,
      userName: user.name,
      userEmail: user.email,
    });
  }

  // Determine if we're still loading:
  // - isLoading: still loading from AsyncStorage
  // - userEmail exists but user is undefined: Convex query is still loading
  const isQueryLoading = userEmail !== null && user === undefined;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        household: household ?? null,
        isLoading: isLoading || isQueryLoading,
        signIn,
        signOut,
        createHousehold,
        joinHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
