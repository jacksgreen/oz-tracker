"use client";

import { useAuth } from "@clerk/nextjs";
import { useStoreUser, useCurrentUser } from "@/context/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/ui/motion";

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  useStoreUser();
  const { user, household, isLoading } = useCurrentUser();

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <FadeIn className="text-center">
          <h1
            className="text-3xl text-ink mb-6"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Dog Duty
          </h1>
          <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
        </FadeIn>
      </div>
    );
  }

  if (!isSignedIn || !user || !household) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
