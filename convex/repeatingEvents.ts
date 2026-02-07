import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Add a new repeating event
export const add = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    intervalDays: v.number(),
    startDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("repeatingEvents", {
      householdId: args.householdId,
      title: args.title,
      intervalDays: args.intervalDays,
      startDate: args.startDate,
      notes: args.notes,
    });
  },
});

// Get all repeating events for a household
export const getAll = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("repeatingEvents")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Calculate next due date for each event
    const now = Date.now();
    return events.map((event) => {
      const baseDate = event.lastCompletedDate ?? event.startDate;
      const nextDueDate = baseDate + event.intervalDays * 24 * 60 * 60 * 1000;
      const isDue = nextDueDate <= now;
      const daysUntilDue = Math.ceil((nextDueDate - now) / (24 * 60 * 60 * 1000));

      return {
        ...event,
        nextDueDate,
        isDue,
        daysUntilDue,
      };
    }).sort((a, b) => a.nextDueDate - b.nextDueDate);
  },
});

// Mark a repeating event as done (updates lastCompletedDate)
export const markDone = mutation({
  args: {
    eventId: v.id("repeatingEvents"),
    actingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    await ctx.db.patch(args.eventId, {
      lastCompletedDate: now.getTime(),
    });

    if (args.actingUserId && event) {
      const household = await ctx.db.get(event.householdId);
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        householdId: event.householdId,
        excludeUserId: args.actingUserId,
        title: `${event.title} Done!`,
        body: `${household?.dogName ?? "The dog"}'s ${event.title.toLowerCase()} is complete.`,
      });
    }
  },
});

// Update a repeating event
export const update = mutation({
  args: {
    eventId: v.id("repeatingEvents"),
    title: v.optional(v.string()),
    intervalDays: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    await ctx.db.patch(eventId, filteredUpdates);
  },
});

// Delete a repeating event
export const remove = mutation({
  args: { eventId: v.id("repeatingEvents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.eventId);
  },
});
