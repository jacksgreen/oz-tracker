import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUser, getAuthUserWithHousehold } from "./auth";

export const add = mutation({
  args: {
    title: v.string(),
    date: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, household } = await getAuthUserWithHousehold(ctx);

    const id = await ctx.db.insert("appointments", {
      householdId: household._id,
      title: args.title,
      date: args.date,
      location: args.location,
      notes: args.notes,
      completed: false,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: household._id,
      excludeUserId: user._id,
      title: "Appointment Scheduled",
      body: `${args.title} for ${household.dogName} has been scheduled.`,
    });

    return id;
  },
});

export const getUpcoming = query({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);
    const now = Date.now();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .filter((q) => q.and(
        q.gte(q.field("date"), now),
        q.eq(q.field("completed"), false)
      ))
      .collect();

    return appointments.sort((a, b) => a.date - b.date);
  },
});

export const getAll = query({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect();

    return appointments.sort((a, b) => b.date - a.date);
  },
});

export const markComplete = mutation({
  args: {
    appointmentId: v.id("appointments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.appointmentId, {
      completed: true,
      notes: args.notes,
    });

    const household = await ctx.db.get(appointment.householdId);
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: appointment.householdId,
      excludeUserId: user._id,
      title: "Appointment Complete",
      body: `${appointment.title} for ${household?.dogName ?? "the dog"} has been completed.`,
    });
  },
});

export const update = mutation({
  args: {
    appointmentId: v.id("appointments"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

    const { appointmentId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    await ctx.db.patch(appointmentId, filteredUpdates);
  },
});

export const remove = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.appointmentId);
  },
});
