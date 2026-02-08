import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUser, getAuthUserWithHousehold } from "./auth";

// Add a new repeating event
export const add = mutation({
  args: {
    title: v.string(),
    intervalDays: v.number(),
    startDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    return await ctx.db.insert("repeatingEvents", {
      householdId: household._id,
      title: args.title,
      intervalDays: args.intervalDays,
      startDate: args.startDate,
      notes: args.notes,
    });
  },
});

// Get all repeating events for a household
export const getAll = query({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    const events = await ctx.db
      .query("repeatingEvents")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
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
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    await ctx.db.patch(args.eventId, {
      lastCompletedDate: now.getTime(),
    });

    const household = await ctx.db.get(event.householdId);
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: event.householdId,
      excludeUserId: user._id,
      title: `${event.title} Done!`,
      body: `${household?.dogName ?? "The dog"}'s ${event.title.toLowerCase()} is complete.`,
    });
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
    const user = await getAuthUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

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
    const user = await getAuthUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.eventId);
  },
});
