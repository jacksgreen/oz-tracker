"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCurrentUser } from "@/context/AuthContext";
import { Modal } from "./Modal";
import {
  IoSunny,
  IoMoon,
  IoChevronBack,
  IoChevronForward,
  IoAdd,
  IoCheckmark,
} from "react-icons/io5";
import type { Id } from "../convex/_generated/dataModel";

type ShiftType = "am" | "pm";

const SHIFT_CONFIG = {
  am: { shortLabel: "AM", label: "Morning Shift", Icon: IoSunny, color: "#8B7355" },
  pm: { shortLabel: "PM", label: "Evening Shift", Icon: IoMoon, color: "#6B6B6B" },
} as const;

const SHIFT_ORDER: ShiftType[] = ["am", "pm"];

export function ScheduleTab() {
  const { user, household } = useCurrentUser();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);

  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + selectedWeekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedWeekOffset]);

  const careShifts = useQuery(
    api.careShifts.getByDateRange,
    household
      ? {
          startDate: weekDates[0].getTime(),
          endDate: weekDates[6].getTime(),
        }
      : "skip"
  );

  const members = useQuery(
    api.households.getMembers,
    household ? {} : "skip"
  );

  const scheduleShift = useMutation(api.careShifts.schedule);
  const clearShiftAssignment = useMutation(api.careShifts.clearAssignment);

  const getShiftForDateAndType = (date: Date, shiftType: ShiftType) => {
    const ts = new Date(date).setHours(0, 0, 0, 0);
    return careShifts?.find((s) => s.date === ts && s.type === shiftType);
  };

  const handleCellPress = (date: Date, shiftType: ShiftType) => {
    setSelectedDate(date);
    setSelectedShift(shiftType);
    setModalVisible(true);
  };

  const handleAssign = async (memberId: Id<"users">, memberName: string) => {
    if (!selectedDate || !selectedShift || !household) return;
    const ts = new Date(selectedDate).setHours(0, 0, 0, 0);
    await scheduleShift({
      assignedUserId: memberId,
      assignedUserName: memberName,
      type: selectedShift,
      date: ts,
    });
    setModalVisible(false);
  };

  const handleClear = async () => {
    if (!selectedDate || !selectedShift || !household) return;
    const ts = new Date(selectedDate).setHours(0, 0, 0, 0);
    await clearShiftAssignment({ date: ts, type: selectedShift });
    setModalVisible(false);
  };

  const getWeekLabel = () => {
    if (selectedWeekOffset === 0) return "This Week";
    if (selectedWeekOffset === 1) return "Next Week";
    if (selectedWeekOffset === -1) return "Last Week";
    const sm = weekDates[0].toLocaleDateString("en-US", { month: "short" });
    const sd = weekDates[0].getDate();
    const em = weekDates[6].toLocaleDateString("en-US", { month: "short" });
    const ed = weekDates[6].getDate();
    return sm === em ? `${sm} ${sd} - ${ed}` : `${sm} ${sd} - ${em} ${ed}`;
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (!household) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-2 animate-slide-up">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-1">
          PLAN AHEAD
        </p>
        <h1
          className="text-3xl text-ink"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Schedule
        </h1>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between border border-border rounded px-4 py-2 my-4">
        <button
          onClick={() => setSelectedWeekOffset((o) => o - 1)}
          className="w-9 h-9 flex items-center justify-center cursor-pointer"
        >
          <IoChevronBack size={20} className="text-ink" />
        </button>
        <div className="text-center flex-1">
          <p className="text-[15px] font-medium text-ink">{getWeekLabel()}</p>
          {selectedWeekOffset !== 0 && (
            <button
              onClick={() => setSelectedWeekOffset(0)}
              className="mt-1 px-2 py-0.5 border border-ink rounded text-xs font-medium text-ink cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setSelectedWeekOffset((o) => o + 1)}
          className="w-9 h-9 flex items-center justify-center cursor-pointer"
        >
          <IoChevronForward size={20} className="text-ink" />
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="border border-border rounded-lg bg-white p-2 mb-6 shadow-sm animate-slide-up stagger-1">
        {/* Day Headers */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-0.5 mb-2">
          <div />
          {weekDates.map((date, i) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            return (
              <div
                key={i}
                className={`text-center py-1 rounded ${isToday ? "bg-ink" : ""}`}
              >
                <p
                  className={`text-[10px] font-medium uppercase tracking-[0.5px] ${isToday ? "text-cream" : "text-ink-faint"}`}
                >
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p
                  className={`mt-0.5 ${isToday ? "text-cream" : "text-ink"}`}
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    fontSize: "16px",
                  }}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Shift Rows */}
        {careShifts === undefined ? (
          <div className="h-[140px] flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ink-faint">Loading schedule...</p>
          </div>
        ) : (
          SHIFT_ORDER.map((shiftType) => {
            const config = SHIFT_CONFIG[shiftType];
            return (
              <div
                key={shiftType}
                className="grid grid-cols-[48px_repeat(7,1fr)] gap-0.5 mb-1"
              >
                <div className="flex flex-col items-center justify-center gap-0.5 py-2">
                  <config.Icon size={14} style={{ color: config.color }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.5px]"
                    style={{ color: config.color }}
                  >
                    {config.shortLabel}
                  </span>
                </div>
                {weekDates.map((date, i) => {
                  const entry = getShiftForDateAndType(date, shiftType);
                  const isPast =
                    date < new Date(new Date().setHours(0, 0, 0, 0));
                  const isCompleted = entry?.completed;

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        !isCompleted && handleCellPress(date, shiftType)
                      }
                      className={`h-13 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                        isCompleted
                          ? "bg-success-light border-border"
                          : entry
                            ? "bg-white border-border"
                            : "bg-parchment border-transparent"
                      } ${isPast && !isCompleted ? "opacity-40" : ""}`}
                    >
                      {entry ? (
                        isCompleted ? (
                          <IoCheckmark size={18} className="text-success" />
                        ) : (
                          <div className="w-8 h-8 rounded-full border border-border-dark flex items-center justify-center bg-white">
                            <span className="text-[11px] font-semibold text-ink">
                              {getInitials(entry.assignedUserName)}
                            </span>
                          </div>
                        )
                      ) : (
                        !isPast && (
                          <IoAdd size={16} className="text-ink-faint" />
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Shift Explanation */}
      <div className="mb-6 pb-6 border-b border-border">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
          SHIFTS
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <IoSunny size={14} style={{ color: "#8B7355" }} />
            <span className="text-sm font-semibold text-ink w-6">AM</span>
            <span className="text-sm text-ink-muted">
              Morning walk + breakfast
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IoMoon size={14} style={{ color: "#6B6B6B" }} />
            <span className="text-sm font-semibold text-ink w-6">PM</span>
            <span className="text-sm text-ink-muted">
              Evening walk + dinner
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
          HOUSEHOLD MEMBERS
        </p>
        {members === undefined ? (
          <div className="h-12 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {members?.map((member) => (
              <div key={member._id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-border-dark bg-white flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-ink">
                    {getInitials(member.name)}
                  </span>
                </div>
                <span className="text-sm font-medium text-ink">
                  {member.name}
                  {member._id === user?._id && " (You)"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-ink-faint text-center">
        Tap any cell to assign a shift.
      </p>

      {/* Assignment Modal */}
      <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
        {selectedShift && selectedDate && (
          <div className="p-6">
            <div className="mb-6 pb-4 border-b border-border">
              <h3
                className="text-xl text-ink mb-1"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {SHIFT_CONFIG[selectedShift].label}
              </h3>
              <p className="text-sm text-ink-muted">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
              ASSIGN TO
            </p>

            <div className="space-y-2">
              {members?.map((member) => {
                const currentEntry = getShiftForDateAndType(
                  selectedDate,
                  selectedShift
                );
                const isAssigned =
                  currentEntry?.assignedUserId === member._id;
                return (
                  <button
                    key={member._id}
                    onClick={() => handleAssign(member._id, member.name)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                      isAssigned
                        ? "border-ink"
                        : "border-border hover:border-border-dark"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                        isAssigned
                          ? "bg-ink border-ink"
                          : "bg-white border-border-dark"
                      }`}
                    >
                      <span
                        className={`${isAssigned ? "text-cream" : "text-ink"}`}
                        style={{
                          fontFamily: "var(--font-instrument-serif)",
                          fontSize: "16px",
                        }}
                      >
                        {getInitials(member.name)}
                      </span>
                    </div>
                    <span
                      className={`flex-1 text-[15px] text-left ${isAssigned ? "font-semibold" : "font-medium"} text-ink`}
                    >
                      {member.name}
                      {member._id === user?._id && " (You)"}
                    </span>
                    {isAssigned && (
                      <IoCheckmark size={20} className="text-ink" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate &&
              selectedShift &&
              getShiftForDateAndType(selectedDate, selectedShift) &&
              !getShiftForDateAndType(selectedDate, selectedShift)
                ?.completed && (
                <button
                  onClick={handleClear}
                  className="w-full mt-6 py-4 text-center text-sm text-ink-faint cursor-pointer"
                >
                  Clear Assignment
                </button>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}
