"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";

export default function Page() {
  const { user, household, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-muted text-sm tracking-wider uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!user || !household) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
