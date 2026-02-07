import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Schedule/assign a care shift (creates uncompleted entry)
export const schedule = mutation({
  args: {
    householdId: v.id("households"),
    assignedUserId: v.id("users"),
    assignedUserName: v.string(),
    type: v.union(v.literal("am"), v.literal("pm")),
    date: v.number(), // Start of day timestamp
    actingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Check if there's already an entry for this date/type
    const existing = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (existing) {
      // Update the assignment
      await ctx.db.patch(existing._id, {
        assignedUserId: args.assignedUserId,
        assignedUserName: args.assignedUserName,
      });

      if (args.actingUserId) {
        const household = await ctx.db.get(args.householdId);
        const shiftLabel = args.type === "am" ? "Morning" : "Evening";
        await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
          householdId: args.householdId,
          excludeUserId: args.actingUserId,
          title: "Shift Assigned",
          body: `${args.assignedUserName} will handle ${household?.dogName ?? "the dog"}'s ${shiftLabel.toLowerCase()} shift.`,
        });
      }

      return existing._id;
    }

    // Create new scheduled shift
    const id = await ctx.db.insert("careShifts", {
      householdId: args.householdId,
      type: args.type,
      date: args.date,
      assignedUserId: args.assignedUserId,
      assignedUserName: args.assignedUserName,
      completed: false,
    });

    if (args.actingUserId) {
      const household = await ctx.db.get(args.householdId);
      const shiftLabel = args.type === "am" ? "Morning" : "Evening";
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        householdId: args.householdId,
        excludeUserId: args.actingUserId,
        title: "Shift Assigned",
        body: `${args.assignedUserName} will handle ${household?.dogName ?? "the dog"}'s ${shiftLabel.toLowerCase()} shift.`,
      });
    }

    return id;
  },
});

// Mark a care shift as completed
export const complete = mutation({
  args: {
    shiftId: v.id("careShifts"),
    completedByUserId: v.id("users"),
    completedByUserName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    await ctx.db.patch(args.shiftId, {
      completed: true,
      completedAt: Date.now(),
      completedByUserId: args.completedByUserId,
      completedByUserName: args.completedByUserName,
      notes: args.notes,
    });

    if (shift) {
      const household = await ctx.db.get(shift.householdId);
      const shiftLabel = shift.type === "am" ? "Morning" : "Evening";
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        householdId: shift.householdId,
        excludeUserId: args.completedByUserId,
        title: `${shiftLabel} shift done!`,
        body: `${args.completedByUserName} completed ${household?.dogName ?? "the dog"}'s ${shiftLabel.toLowerCase()} walk and meal.`,
      });
    }
  },
});

// Undo a completed shift (mark as incomplete)
export const uncomplete = mutation({
  args: {
    shiftId: v.id("careShifts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shiftId, {
      completed: false,
      completedAt: undefined,
      completedByUserId: undefined,
      completedByUserName: undefined,
      notes: undefined,
    });
  },
});

// Quick log: create and immediately complete a shift (for unscheduled)
export const logNow = mutation({
  args: {
    householdId: v.id("households"),
    userId: v.id("users"),
    userName: v.string(),
    type: v.union(v.literal("am"), v.literal("pm")),
    notes: v.optional(v.string()),
    clientDate: v.number(), // Client's local start-of-day timestamp
  },
  handler: async (ctx, args) => {
    // Use client-provided date to ensure timezone consistency
    const dateTimestamp = args.clientDate;

    // Check if there's already an entry for today
    const existing = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", dateTimestamp)
      )
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    let resultId;

    if (existing) {
      // Complete the existing entry
      await ctx.db.patch(existing._id, {
        completed: true,
        completedAt: Date.now(),
        completedByUserId: args.userId,
        completedByUserName: args.userName,
        notes: args.notes,
      });
      resultId = existing._id;
    } else {
      // Create new completed shift (user is both assigned and completer)
      resultId = await ctx.db.insert("careShifts", {
        householdId: args.householdId,
        type: args.type,
        date: dateTimestamp,
        assignedUserId: args.userId,
        assignedUserName: args.userName,
        completed: true,
        completedAt: Date.now(),
        completedByUserId: args.userId,
        completedByUserName: args.userName,
        notes: args.notes,
      });
    }

    const household = await ctx.db.get(args.householdId);
    const shiftLabel = args.type === "am" ? "Morning" : "Evening";
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: args.householdId,
      excludeUserId: args.userId,
      title: `${shiftLabel} shift done!`,
      body: `${args.userName} completed ${household?.dogName ?? "the dog"}'s ${shiftLabel.toLowerCase()} walk and meal.`,
    });

    return resultId;
  },
});

// Get care shifts for today
export const getToday = query({
  args: {
    householdId: v.id("households"),
    clientDate: v.number(), // Client's local start-of-day timestamp
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.clientDate)
      )
      .collect();
  },
});

// Get care shifts for a date range (for schedule view)
export const getByDateRange = query({
  args: {
    householdId: v.id("households"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q
          .eq("householdId", args.householdId)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .collect();
  },
});

// Clear assignment (delete if not completed)
export const clearAssignment = mutation({
  args: {
    householdId: v.id("households"),
    date: v.number(),
    type: v.union(v.literal("am"), v.literal("pm")),
  },
  handler: async (ctx, args) => {
    const shift = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (shift && !shift.completed) {
      await ctx.db.delete(shift._id);
    }
  },
});

// Delete a care shift
export const remove = mutation({
  args: { shiftId: v.id("careShifts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.shiftId);
  },
});
