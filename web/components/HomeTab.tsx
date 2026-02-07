"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "@/context/AuthContext";
import {
  IoSunny,
  IoMoon,
  IoCheckmarkCircle,
  IoCheckmark,
  IoAdd,
  IoChevronForward,
  IoLocationOutline,
  IoRibbon,
} from "react-icons/io5";

const getTodayTimestamp = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

type ShiftType = "am" | "pm";

const SHIFT_CONFIG = {
  am: {
    label: "Morning Shift",
    description: "Walk + Breakfast",
    Icon: IoSunny,
    color: "#8B7355",
  },
  pm: {
    label: "Evening Shift",
    description: "Walk + Dinner",
    Icon: IoMoon,
    color: "#6B6B6B",
  },
} as const;

export function HomeTab() {
  const { user, household } = useAuth();
  const todayTimestamp = getTodayTimestamp();

  const todayShifts = useQuery(
    api.careShifts.getToday,
    household ? { householdId: household._id, clientDate: todayTimestamp } : "skip"
  );

  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? { householdId: household._id } : "skip"
  );

  const logShift = useMutation(api.careShifts.logNow);
  const uncompleteShift = useMutation(api.careShifts.uncomplete);

  const amShift = todayShifts?.find((s) => s.type === "am");
  const pmShift = todayShifts?.find((s) => s.type === "pm");
  const nextAppointment = upcomingAppointments?.[0];
  const completedShifts = (amShift?.completed ? 1 : 0) + (pmShift?.completed ? 1 : 0);

  const handleLogShift = async (type: ShiftType) => {
    if (!user || !household) return;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    await logShift({
      householdId: household._id,
      userId: user._id,
      userName: user.name,
      type,
      clientDate: d.getTime(),
    });
  };

  const handleUndoShift = async (shiftId: string) => {
    await uncompleteShift({ shiftId: shiftId as any });
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (!household) return null;

  const renderShiftCard = (type: ShiftType, shift: typeof amShift) => {
    const config = SHIFT_CONFIG[type];
    const isCompleted = shift?.completed;

    return (
      <button
        key={type}
        onClick={() =>
          isCompleted && shift
            ? handleUndoShift(shift._id)
            : handleLogShift(type)
        }
        className={`w-full bg-white rounded-lg p-6 border border-border text-left transition-all hover:shadow-sm cursor-pointer ${
          isCompleted ? "border-l-[3px] border-l-success" : ""
        }`}
      >
        <div className="flex items-center mb-4">
          <config.Icon
            size={18}
            style={{ color: config.color }}
            className="mr-2"
          />
          <div>
            <p
              className="text-lg text-ink"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {config.label}
            </p>
            <p className="text-sm text-ink-muted">{config.description}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          {isCompleted ? (
            <div className="flex items-center gap-2 mt-2">
              <IoCheckmarkCircle size={22} className="text-success" />
              <div>
                <p className="text-[15px] font-medium text-ink">
                  {shift.completedByUserName}
                </p>
                <p className="text-xs text-ink-muted">
                  {formatTime(shift.completedAt!)}
                </p>
              </div>
            </div>
          ) : shift ? (
            <div className="flex items-center gap-4 mt-2">
              <div className="w-9 h-9 rounded-full border border-border-dark flex items-center justify-center bg-white">
                <span
                  className="text-ink"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    fontSize: "16px",
                  }}
                >
                  {shift.assignedUserName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-ink-faint">Assigned to</p>
                <p className="text-[15px] font-medium text-ink">
                  {shift.assignedUserName}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                <IoCheckmark size={16} className="text-ink-faint" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-2">
              <div className="w-9 h-9 rounded-full border border-border-dark flex items-center justify-center">
                <IoAdd size={18} className="text-ink-faint" />
              </div>
              <p className="text-sm text-ink-faint">Tap to mark as done</p>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-1.5">
            {getGreeting()}
          </p>
          <h1
            className="text-4xl text-ink"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              letterSpacing: "-0.5px",
            }}
          >
            {household.dogName}&apos;s Day
          </h1>
        </div>
        <div className="w-13 h-13 rounded-full border border-border-dark flex items-center justify-center bg-white">
          <span
            className="text-ink text-2xl"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {household.dogName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Today's Shifts */}
      <div className="space-y-4 mb-8">
        {todayShifts === undefined ? (
          <>
            <div className="bg-white rounded-lg p-6 border border-border h-[120px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="bg-white rounded-lg p-6 border border-border h-[120px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        ) : (
          <>
            {renderShiftCard("am", amShift)}
            {renderShiftCard("pm", pmShift)}
          </>
        )}
      </div>

      {/* Today's Progress */}
      <div className="mb-8">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
          TODAY&apos;S PROGRESS
        </p>
        <div className="bg-white rounded-lg p-6 border border-border flex items-center">
          <div className="mr-6 text-center">
            <p
              className={`text-4xl leading-tight ${completedShifts === 2 ? "text-success" : "text-ink"}`}
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {completedShifts}
            </p>
            <p className="text-xs text-ink-faint -mt-1">of 2</p>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink mb-1">
              Shifts Completed
            </p>
            <p className="text-sm text-ink-muted">
              {completedShifts === 0 && "No shifts done yet today"}
              {completedShifts === 1 && "One more shift to go"}
              {completedShifts === 2 && "All done for today"}
            </p>
          </div>
          {completedShifts === 2 && (
            <IoRibbon size={24} className="text-success ml-2" />
          )}
        </div>
      </div>

      {/* Upcoming Appointment */}
      {upcomingAppointments === undefined ? (
        <div className="mb-8">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
            UPCOMING APPOINTMENT
          </p>
          <div className="bg-white rounded-lg p-6 border border-border h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : (
        nextAppointment && (
          <div className="mb-8">
            <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
              UPCOMING APPOINTMENT
            </p>
            <div className="bg-white rounded-lg p-6 border border-border border-l-[3px] border-l-accent flex items-center">
              <div className="flex-1">
                <p
                  className="text-lg text-ink mb-1"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {nextAppointment.title}
                </p>
                <p className="text-sm text-ink-muted font-medium">
                  {formatDate(nextAppointment.date)} at{" "}
                  {formatTime(nextAppointment.date)}
                </p>
                {nextAppointment.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <IoLocationOutline size={14} className="text-ink-faint" />
                    <p className="text-xs text-ink-faint">
                      {nextAppointment.location}
                    </p>
                  </div>
                )}
              </div>
              <IoChevronForward size={18} className="text-ink-faint" />
            </div>
          </div>
        )
      )}
    </div>
  );
}
