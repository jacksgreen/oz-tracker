"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  IoArrowForward,
  IoArrowBack,
  IoPeopleOutline,
  IoCalendarOutline,
  IoMedicalOutline,
  IoChevronForward,
  IoCheckmark,
} from "react-icons/io5";

type AuthStep =
  | "welcome"
  | "signin"
  | "household-choice"
  | "create-household"
  | "join-household";

export function AuthScreen() {
  const { signIn, createHousehold, joinHousehold, user, household } = useAuth();

  const [step, setStep] = useState<AuthStep>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [dogName, setDogName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await signIn(email.trim().toLowerCase(), name.trim());
      setStep("household-choice");
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !dogName.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const code = await createHousehold(householdName.trim(), dogName.trim());
      setCreatedInviteCode(code);
    } catch {
      setError("Failed to create household. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await joinHousehold(inviteCode.trim().toUpperCase());
    } catch {
      setError("Invalid invite code. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") action();
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {step === "welcome" && (
          <div>
            <div className="text-center mt-8 mb-10">
              <h1
                className="text-5xl text-ink mb-2"
                style={{
                  fontFamily: "var(--font-instrument-serif)",
                  letterSpacing: "-1px",
                }}
              >
                Dog Duty
              </h1>
              <p
                className="text-ink-muted text-lg"
                style={{
                  fontFamily: "var(--font-instrument-serif)",
                  fontStyle: "italic",
                }}
              >
                Share the work of caring for your dog
              </p>
            </div>

            <button
              onClick={() => setStep("signin")}
              className="w-full h-13 bg-ink text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase hover:bg-ink-light transition-colors cursor-pointer"
            >
              GET STARTED
              <IoArrowForward size={18} />
            </button>

            <div className="mt-12 space-y-6">
              {[
                {
                  icon: IoPeopleOutline,
                  text: "Coordinate walks and meals with your household",
                },
                {
                  icon: IoCalendarOutline,
                  text: "Schedule shifts so everyone knows who's on duty",
                },
                {
                  icon: IoMedicalOutline,
                  text: "Track vet visits, flea meds, and recurring care",
                },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4">
                  <Icon size={18} className="text-ink-muted shrink-0" />
                  <p className="text-ink-muted text-[15px] leading-relaxed">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "signin" && (
          <div>
            <button
              onClick={() => setStep("welcome")}
              className="mb-8 cursor-pointer"
            >
              <IoArrowBack size={22} className="text-ink" />
            </button>

            <h2
              className="text-3xl text-ink mb-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Welcome
            </h2>
            <p className="text-ink-muted text-[15px] mb-8">
              Let&apos;s get you set up
            </p>

            <div className="mb-6">
              <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                YOUR NAME
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, () => {})}
                className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
                autoCapitalize="words"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                EMAIL
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSignIn)}
                className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
              />
            </div>

            {error && (
              <p className="text-error text-sm mb-4 -mt-2">{error}</p>
            )}

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full h-13 bg-ink text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase hover:bg-ink-light transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  CONTINUE
                  <IoArrowForward size={18} />
                </>
              )}
            </button>
          </div>
        )}

        {step === "household-choice" && (
          <div>
            <h2
              className="text-3xl text-ink mb-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Set Up Your Household
            </h2>
            <p className="text-ink-muted text-[15px] mb-8">
              Create a new household or join an existing one with an invite code
            </p>

            <button
              onClick={() => setStep("create-household")}
              className="w-full flex items-center p-6 mb-4 border border-border rounded-lg hover:border-border-dark transition-colors text-left cursor-pointer"
            >
              <div className="flex-1">
                <p className="text-ink font-medium mb-1">
                  Create New Household
                </p>
                <p className="text-ink-muted text-sm">
                  Start fresh and invite your family
                </p>
              </div>
              <IoChevronForward size={20} className="text-ink-muted" />
            </button>

            <button
              onClick={() => setStep("join-household")}
              className="w-full flex items-center p-6 border border-border rounded-lg hover:border-border-dark transition-colors text-left cursor-pointer"
            >
              <div className="flex-1">
                <p className="text-ink font-medium mb-1">
                  Join Existing Household
                </p>
                <p className="text-ink-muted text-sm">
                  Enter an invite code to join
                </p>
              </div>
              <IoChevronForward size={20} className="text-ink-muted" />
            </button>
          </div>
        )}

        {step === "create-household" && (
          <div>
            <button
              onClick={() => setStep("household-choice")}
              className="mb-8 cursor-pointer"
            >
              <IoArrowBack size={22} className="text-ink" />
            </button>

            {createdInviteCode ? (
              <div className="text-center pt-8">
                <div className="w-13 h-13 rounded-full border border-success flex items-center justify-center mx-auto mb-6">
                  <IoCheckmark size={28} className="text-success" />
                </div>
                <h2
                  className="text-3xl text-ink mb-2"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  You&apos;re All Set
                </h2>
                <p className="text-ink-muted text-[15px] mb-8">
                  Share this code with your partner to join
                </p>

                <div className="border border-border-dark rounded-lg py-6 px-8 mb-8">
                  <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                    INVITE CODE
                  </p>
                  <p
                    className="text-4xl text-ink tracking-[4px]"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {createdInviteCode}
                  </p>
                </div>

                {household ? (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full h-13 bg-ink text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase hover:bg-ink-light transition-colors cursor-pointer"
                  >
                    START TRACKING
                    <IoArrowForward size={18} />
                  </button>
                ) : (
                  <div className="w-full h-13 bg-ink/60 text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase">
                    <div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </div>
                )}
              </div>
            ) : (
              <>
                <h2
                  className="text-3xl text-ink mb-2"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  Create Household
                </h2>
                <p className="text-ink-muted text-[15px] mb-8">
                  Tell us about your home
                </p>

                <div className="mb-6">
                  <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                    HOUSEHOLD NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., The Smith Family"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                    DOG&apos;S NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Your dog's name"
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleCreateHousehold)}
                    className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
                  />
                </div>

                {error && (
                  <p className="text-error text-sm mb-4 -mt-2">{error}</p>
                )}

                <button
                  onClick={handleCreateHousehold}
                  disabled={isLoading}
                  className="w-full h-13 bg-ink text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase hover:bg-ink-light transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      CREATE HOUSEHOLD
                      <IoArrowForward size={18} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {step === "join-household" && (
          <div>
            <button
              onClick={() => setStep("household-choice")}
              className="mb-8 cursor-pointer"
            >
              <IoArrowBack size={22} className="text-ink" />
            </button>

            <h2
              className="text-3xl text-ink mb-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Join Household
            </h2>
            <p className="text-ink-muted text-[15px] mb-8">
              Enter the invite code shared with you
            </p>

            <div className="mb-6">
              <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
                INVITE CODE
              </label>
              <input
                type="text"
                placeholder="XXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => handleKeyDown(e, handleJoinHousehold)}
                maxLength={6}
                className="w-full border-b border-border-dark bg-transparent py-4 text-2xl font-semibold text-ink text-center tracking-[8px] placeholder:text-ink-faint placeholder:font-normal placeholder:tracking-[8px]"
              />
            </div>

            {error && (
              <p className="text-error text-sm mb-4 -mt-2">{error}</p>
            )}

            <button
              onClick={handleJoinHousehold}
              disabled={isLoading}
              className="w-full h-13 bg-ink text-cream rounded flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase hover:bg-ink-light transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  JOIN HOUSEHOLD
                  <IoArrowForward size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
