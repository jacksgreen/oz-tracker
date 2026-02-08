"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "../convex/_generated/api";
import { useCurrentUser } from "@/context/AuthContext";
import { IoShareOutline, IoCheckmark } from "react-icons/io5";

const MEMBER_COLORS = [
  { bg: "#F2EDE5", text: "#8B7355" },
  { bg: "#E8E4EF", text: "#6B6080" },
  { bg: "#E5ECE8", text: "#5B7365" },
  { bg: "#EDE5E5", text: "#7B5555" },
  { bg: "#E5E8ED", text: "#556075" },
  { bg: "#EDE8E0", text: "#756B55" },
];

export function HouseholdTab() {
  const { user, household } = useCurrentUser();
  const { signOut } = useClerk();
  const [copied, setCopied] = useState(false);

  const members = useQuery(
    api.households.getMembers,
    household ? {} : "skip"
  );

  const handleShareInviteCode = async () => {
    if (!household) return;
    const text = `Join my household "${household.name}" on Dog Duty! Use invite code: ${household.inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(household.inviteCode);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      signOut();
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getMemberColor = (name: string) =>
    MEMBER_COLORS[name.charCodeAt(0) % MEMBER_COLORS.length];

  if (!household) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center py-6 mb-8 animate-slide-up">
        <h1
          className="text-4xl text-ink mb-1"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            letterSpacing: "-0.5px",
          }}
        >
          {household.name}
        </h1>
        <p className="text-sm text-ink-muted">
          Taking care of {household.dogName} together
        </p>
      </div>

      {/* Invite Code */}
      <div className="mb-8 pb-8 border-b border-border">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
          INVITE CODE
        </p>
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-[22px] font-semibold text-ink tracking-[3px]"
            style={{ fontFamily: "monospace" }}
          >
            {household.inviteCode}
          </p>
          <button
            onClick={handleShareInviteCode}
            className="flex items-center gap-1 py-2 px-4 border border-ink rounded text-xs font-medium tracking-wider uppercase hover:bg-cream-dark transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <IoCheckmark size={16} className="text-success" />
                <span className="text-success">Shared</span>
              </>
            ) : (
              <>
                <IoShareOutline size={16} className="text-ink" />
                <span className="text-ink">Share</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-ink-faint">
          Share this code to add family members
        </p>
      </div>

      {/* Members */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted">
            MEMBERS
          </p>
          <span className="text-xs font-medium text-ink-faint">
            {members?.length || 0}
          </span>
        </div>

        {members === undefined ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {members?.map((member, index) => {
              const isCurrentUser = member._id === user?._id;
              const color = getMemberColor(member.name);
              return (
                <div
                  key={member._id}
                  className={`flex items-center py-4 ${
                    index < (members?.length || 0) - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-full border border-border flex items-center justify-center mr-4 shrink-0"
                    style={{ backgroundColor: color.bg }}
                  >
                    <span
                      className="text-lg"
                      style={{
                        fontFamily: "var(--font-instrument-serif)",
                        color: color.text,
                      }}
                    >
                      {getInitials(member.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ink">
                      {member.name}
                    </p>
                    <p className="text-xs text-ink-faint truncate">
                      {member.email}
                    </p>
                  </div>
                  {isCurrentUser && (
                    <span className="bg-accent text-cream text-[11px] font-semibold tracking-[0.5px] px-2 py-0.5 rounded shrink-0">
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="text-center py-6">
        <button
          onClick={handleSignOut}
          className="text-sm text-ink-faint hover:text-ink-muted transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
