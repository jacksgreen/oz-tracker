"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";

export default function Page() {
  const { user, household, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center animate-fade-in">
          <h1
            className="text-3xl text-ink mb-6"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Dog Duty
          </h1>
          <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user || !household) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
