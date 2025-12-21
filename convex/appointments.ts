import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const add = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    date: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("appointments", {
      householdId: args.householdId,
      title: args.title,
      date: args.date,
      location: args.location,
      notes: args.notes,
      completed: false,
    });
  },
});

export const getUpcoming = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .filter((q) => q.and(
        q.gte(q.field("date"), now),
        q.eq(q.field("completed"), false)
      ))
      .collect();

    return appointments.sort((a, b) => a.date - b.date);
  },
});

export const getAll = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
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
    await ctx.db.patch(args.appointmentId, {
      completed: true,
      notes: args.notes,
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
    await ctx.db.delete(args.appointmentId);
  },
});
