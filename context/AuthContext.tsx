import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  clerkId?: string;
  householdId?: Id<"households">;
}

interface Household {
  _id: Id<"households">;
  dogName: string;
  inviteCode: string;
  inviteCodeCreatedAt?: number;
  ownerId?: Id<"users">;
}

/**
 * Calls users.store once after Clerk sign-in to upsert the Convex user.
 */
export function useStoreUser() {
  const { isSignedIn } = useClerkAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (!isSignedIn) return;
    storeUser();
  }, [isSignedIn, storeUser]);
}

/**
 * Returns the current user and household from Convex.
 * Both queries are auth-guarded server-side (no args needed).
 */
export function useCurrentUser() {
  const { isSignedIn, isLoaded } = useClerkAuth();

  const user = useQuery(
    api.users.get,
    isSignedIn ? {} : "skip"
  ) as User | null | undefined;

  const household = useQuery(
    api.households.get,
    isSignedIn ? {} : "skip"
  ) as Household | null | undefined;

  const isLoading = !isLoaded || (isSignedIn && user === undefined);

  return {
    user: user ?? null,
    household: household ?? null,
    isLoading,
  };
}
