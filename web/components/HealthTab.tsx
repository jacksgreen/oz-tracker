"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "@/context/AuthContext";
import { Modal, FullModal } from "./Modal";
import type { Id } from "../convex/_generated/dataModel";
import {
  IoAdd,
  IoRepeat,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCheckmark,
  IoTrashOutline,
  IoLocationOutline,
  IoChevronUp,
  IoChevronDown,
} from "react-icons/io5";

const INTERVAL_OPTIONS = [
  { label: "Every week", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every month", days: 30 },
  { label: "Every 3 months", days: 90 },
];

export function HealthTab() {
  const { user, household } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Appointment form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring form
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringNotes, setRecurringNotes] = useState("");
  const [selectedInterval, setSelectedInterval] = useState(14);

  const upcomingAppointments = useQuery(
    api.appointments.getUpcoming,
    household ? { householdId: household._id } : "skip"
  );
  const allAppointments = useQuery(
    api.appointments.getAll,
    household ? { householdId: household._id } : "skip"
  );
  const repeatingEvents = useQuery(
    api.repeatingEvents.getAll,
    household ? { householdId: household._id } : "skip"
  );

  const addAppointment = useMutation(api.appointments.add);
  const markComplete = useMutation(api.appointments.markComplete);
  const removeAppointment = useMutation(api.appointments.remove);
  const addRepeatingEvent = useMutation(api.repeatingEvents.add);
  const markEventDone = useMutation(api.repeatingEvents.markDone);
  const removeRepeatingEvent = useMutation(api.repeatingEvents.remove);

  const pastAppointments = allAppointments?.filter((a) => a.completed);

  const handleAddAppointment = async () => {
    if (!household || !title.trim()) return;
    setIsSubmitting(true);
    try {
      await addAppointment({
        householdId: household._id,
        title: title.trim(),
        date: selectedDate.getTime(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        actingUserId: user?._id,
      });
      setTitle("");
      setLocation("");
      setNotes("");
      setSelectedDate(new Date());
      setShowAddModal(false);
    } catch {
      // error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = (appointmentId: Id<"appointments">) => {
    if (confirm("Mark this appointment as completed?")) {
      markComplete({ appointmentId, actingUserId: user?._id });
    }
  };

  const handleDeleteAppointment = (appointmentId: Id<"appointments">) => {
    if (confirm("Delete this appointment?")) {
      removeAppointment({ appointmentId });
    }
  };

  const handleAddRecurringEvent = async () => {
    if (!household || !recurringTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      await addRepeatingEvent({
        householdId: household._id,
        title: recurringTitle.trim(),
        intervalDays: selectedInterval,
        startDate: now.getTime(),
        notes: recurringNotes.trim() || undefined,
      });
      setRecurringTitle("");
      setRecurringNotes("");
      setSelectedInterval(14);
      setShowAddRecurringModal(false);
    } catch {
      // error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecurringEvent = (eventId: Id<"repeatingEvents">) => {
    if (confirm("Delete this recurring event?")) {
      removeRepeatingEvent({ eventId });
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const formatShortDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(10, 0, 0, 0);
    setSelectedDate(d);
  };

  const getDueStatusColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 0) return "text-warning";
    if (daysUntilDue <= 3) return "text-accent";
    return "text-ink-faint";
  };

  const getDueStatusText = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  };

  if (!household) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <h1
          className="text-3xl text-ink"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Health
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-11 h-11 rounded-full bg-ink flex items-center justify-center hover:bg-ink-light hover:shadow-md transition-all cursor-pointer shadow-sm"
        >
          <IoAdd size={22} className="text-cream" />
        </button>
      </div>

      {/* Recurring Care */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted">
            RECURRING CARE
          </p>
          <button
            onClick={() => setShowAddRecurringModal(true)}
            className="w-7 h-7 rounded-full border border-border-dark flex items-center justify-center hover:bg-cream-dark transition-colors cursor-pointer"
          >
            <IoAdd size={16} className="text-ink" />
          </button>
        </div>

        {repeatingEvents === undefined ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !repeatingEvents || repeatingEvents.length === 0 ? (
          <div className="flex items-center gap-4 py-6 border-t border-b border-border">
            <IoRepeat size={20} className="text-ink-faint" />
            <div>
              <p className="text-[15px] font-medium text-ink-muted">
                No recurring care set up
              </p>
              <p className="text-xs text-ink-faint">
                Add flea medicine, heartworm pills, and more
              </p>
            </div>
          </div>
        ) : (
          <div>
            {repeatingEvents.map((event, index) => {
              const isDueOrOverdue = event.daysUntilDue <= 0;
              return (
                <div
                  key={event._id}
                  className={`flex items-center py-4 ${
                    index < repeatingEvents.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-ink">
                      {event.title}
                    </p>
                    <p
                      className={`text-xs font-medium mt-0.5 ${getDueStatusColor(event.daysUntilDue)}`}
                    >
                      {getDueStatusText(event.daysUntilDue)}
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Every {event.intervalDays} days
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        markEventDone({
                          eventId: event._id,
                          actingUserId: user?._id,
                        })
                      }
                      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                        isDueOrOverdue
                          ? "bg-warning border-warning"
                          : "border-border-dark hover:bg-cream-dark"
                      }`}
                    >
                      <IoCheckmark
                        size={18}
                        className={
                          isDueOrOverdue ? "text-cream" : "text-ink"
                        }
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteRecurringEvent(event._id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-dark transition-colors cursor-pointer"
                    >
                      <IoTrashOutline size={16} className="text-ink-faint" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vet Visits */}
      <div className="mb-8">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-4">
          VET VISITS
        </p>

        {upcomingAppointments === undefined ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-ink-faint border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
          <div className="text-center py-8 border-t border-b border-border">
            <IoCalendarOutline size={36} className="text-ink-faint mx-auto" />
            <p className="text-[15px] font-medium text-ink-muted mt-4">
              No upcoming appointments
            </p>
            <p className="text-xs text-ink-faint mt-1 mb-6">
              {household.dogName} is all caught up
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 border border-ink rounded text-xs font-medium tracking-wider uppercase text-ink hover:bg-cream-dark transition-colors cursor-pointer"
            >
              SCHEDULE VISIT
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAppointments.map((appointment, index) => (
              <div
                key={appointment._id}
                className={`flex items-center p-4 border border-border rounded-lg bg-white ${
                  index === 0 ? "border-l-[3px] border-l-accent" : ""
                }`}
              >
                <div className="w-11 text-center mr-4">
                  <p
                    className={`text-2xl ${index === 0 ? "text-accent" : "text-ink"}`}
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {new Date(appointment.date).getDate()}
                  </p>
                  <p className="text-xs font-medium text-ink-muted uppercase">
                    {new Date(appointment.date).toLocaleDateString([], {
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ink mb-1">
                    {appointment.title}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {formatDate(appointment.date)} at{" "}
                    {formatTime(appointment.date)}
                  </p>
                  {appointment.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <IoLocationOutline
                        size={13}
                        className="text-ink-faint"
                      />
                      <p className="text-xs text-ink-faint truncate">
                        {appointment.location}
                      </p>
                    </div>
                  )}
                  {appointment.notes && (
                    <p className="text-xs text-ink-faint mt-1 italic truncate">
                      {appointment.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleMarkComplete(appointment._id)}
                    className="p-1.5 hover:bg-cream-dark rounded-full transition-colors cursor-pointer"
                    title="Mark complete"
                  >
                    <IoCheckmarkCircleOutline
                      size={22}
                      className="text-ink-faint"
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteAppointment(appointment._id)}
                    className="p-1.5 hover:bg-cream-dark rounded-full transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <IoTrashOutline size={16} className="text-ink-faint" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Visits */}
      {pastAppointments && pastAppointments.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted">
              PAST VISITS
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-ink-faint">
                {pastAppointments.length}
              </span>
              {showPast ? (
                <IoChevronUp size={18} className="text-ink-muted" />
              ) : (
                <IoChevronDown size={18} className="text-ink-muted" />
              )}
            </div>
          </button>

          {showPast && (
            <div className="mt-2">
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment._id}
                  className="flex items-center gap-4 py-4 border-b border-border"
                >
                  <IoCheckmark size={16} className="text-success" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">
                      {appointment.title}
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {formatShortDate(appointment.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Appointment Modal */}
      <FullModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <button
            onClick={() => setShowAddModal(false)}
            className="text-[15px] text-ink-muted cursor-pointer"
          >
            Cancel
          </button>
          <h3
            className="text-[17px] text-ink"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            New Appointment
          </h3>
          <button
            onClick={handleAddAppointment}
            disabled={isSubmitting || !title.trim()}
            className="text-[15px] font-semibold text-ink disabled:text-ink-faint cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              APPOINTMENT TITLE
            </label>
            <input
              type="text"
              placeholder="e.g., Annual Checkup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              WHEN
            </label>
            <div className="flex gap-2 mb-4">
              {[
                { label: "Today", days: 0 },
                { label: "Tomorrow", days: 1 },
                { label: "In 1 Week", days: 7 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setQuickDate(opt.days)}
                  className="flex-1 py-2 px-4 border border-border-dark rounded text-sm font-medium text-ink-muted text-center hover:bg-cream-dark transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 py-2">
              <IoCalendarOutline size={16} className="text-ink-muted" />
              <span className="text-sm font-medium text-ink">
                {formatDate(selectedDate.getTime())} at{" "}
                {formatTime(selectedDate.getTime())}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              LOCATION (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g., Happy Paws Vet Clinic"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              NOTES (OPTIONAL)
            </label>
            <textarea
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint resize-none"
            />
          </div>
        </div>
      </FullModal>

      {/* Add Recurring Event Modal */}
      <FullModal
        visible={showAddRecurringModal}
        onClose={() => setShowAddRecurringModal(false)}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <button
            onClick={() => setShowAddRecurringModal(false)}
            className="text-[15px] text-ink-muted cursor-pointer"
          >
            Cancel
          </button>
          <h3
            className="text-[17px] text-ink"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            New Recurring Care
          </h3>
          <button
            onClick={handleAddRecurringEvent}
            disabled={isSubmitting || !recurringTitle.trim()}
            className="text-[15px] font-semibold text-ink disabled:text-ink-faint cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              WHAT NEEDS TO BE DONE?
            </label>
            <input
              type="text"
              placeholder="e.g., Flea Medicine, Heartworm Pill"
              value={recurringTitle}
              onChange={(e) => setRecurringTitle(e.target.value)}
              className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              HOW OFTEN?
            </label>
            <div className="space-y-2">
              {INTERVAL_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setSelectedInterval(option.days)}
                  className={`w-full py-4 px-6 border rounded text-left text-[15px] font-medium text-ink transition-colors cursor-pointer ${
                    selectedInterval === option.days
                      ? "border-ink font-semibold"
                      : "border-border hover:border-border-dark"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              NOTES (OPTIONAL)
            </label>
            <textarea
              placeholder="Any additional notes..."
              value={recurringNotes}
              onChange={(e) => setRecurringNotes(e.target.value)}
              rows={3}
              className="w-full border-b border-border-dark bg-transparent py-4 text-base text-ink placeholder:text-ink-faint resize-none"
            />
          </div>

          <div>
            <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted mb-2">
              QUICK ADD
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { title: "Flea Medicine", interval: 30 },
                { title: "Heartworm Pill", interval: 30 },
                { title: "Nail Trim", interval: 14 },
                { title: "Ear Cleaning", interval: 7 },
              ].map((s) => (
                <button
                  key={s.title}
                  onClick={() => {
                    setRecurringTitle(s.title);
                    setSelectedInterval(s.interval);
                  }}
                  className="py-2 px-4 border border-border-dark rounded-full text-sm font-medium text-ink-muted hover:bg-cream-dark transition-colors cursor-pointer"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FullModal>
    </div>
  );
}
