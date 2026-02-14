import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUser, getAuthUserWithHousehold } from "./auth";

// Schedule/assign a care shift (creates uncompleted entry)
export const schedule = mutation({
  args: {
    assignedUserId: v.id("users"),
    type: v.union(v.literal("am"), v.literal("pm")),
    date: v.number(), // Start of day timestamp
  },
  handler: async (ctx, args) => {
    const { user, household } = await getAuthUserWithHousehold(ctx);

    // Check if there's already an entry for this date/type
    const existing = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", household._id).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    const assignedUser = await ctx.db.get(args.assignedUserId);
    const assignedUserName = assignedUser?.name ?? "Someone";

    if (existing) {
      await ctx.db.patch(existing._id, {
        assignedUserId: args.assignedUserId,
      });

      const shiftLabel = args.type === "am" ? "Morning" : "Evening";
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        householdId: household._id,
        excludeUserId: user._id,
        title: "Shift Assigned",
        body: `${assignedUserName} will handle ${household.dogName}'s ${shiftLabel.toLowerCase()} shift.`,
      });

      return existing._id;
    }

    // Create new scheduled shift
    const id = await ctx.db.insert("careShifts", {
      householdId: household._id,
      type: args.type,
      date: args.date,
      assignedUserId: args.assignedUserId,
      completed: false,
    });

    const shiftLabel = args.type === "am" ? "Morning" : "Evening";
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: household._id,
      excludeUserId: user._id,
      title: "Shift Assigned",
      body: `${assignedUserName} will handle ${household.dogName}'s ${shiftLabel.toLowerCase()} shift.`,
    });

    return id;
  },
});

// Mark a care shift as completed
export const complete = mutation({
  args: {
    shiftId: v.id("careShifts"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");

    // Verify shift belongs to user's household
    if (shift.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.shiftId, {
      completed: true,
      completedAt: Date.now(),
      completedByUserId: user._id,
      notes: args.notes,
    });

    const household = await ctx.db.get(shift.householdId);
    const shiftLabel = shift.type === "am" ? "Morning" : "Evening";
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: shift.householdId,
      excludeUserId: user._id,
      title: `${shiftLabel} shift done!`,
      body: `${user.name} completed ${household?.dogName ?? "the dog"}'s ${shiftLabel.toLowerCase()} walk and meal.`,
    });
  },
});

// Undo a completed shift (mark as incomplete)
export const uncomplete = mutation({
  args: {
    shiftId: v.id("careShifts"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");
    if (shift.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.shiftId, {
      completed: false,
      completedAt: undefined,
      completedByUserId: undefined,
      notes: undefined,
    });
  },
});

// Quick log: create and immediately complete a shift (for unscheduled)
export const logNow = mutation({
  args: {
    type: v.union(v.literal("am"), v.literal("pm")),
    notes: v.optional(v.string()),
    clientDate: v.number(), // Client's local start-of-day timestamp
  },
  handler: async (ctx, args) => {
    const { user, household } = await getAuthUserWithHousehold(ctx);
    const dateTimestamp = args.clientDate;

    // Check if there's already an entry for today
    const existing = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", household._id).eq("date", dateTimestamp)
      )
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    let resultId;

    if (existing) {
      await ctx.db.patch(existing._id, {
        completed: true,
        completedAt: Date.now(),
        completedByUserId: user._id,
        notes: args.notes,
      });
      resultId = existing._id;
    } else {
      resultId = await ctx.db.insert("careShifts", {
        householdId: household._id,
        type: args.type,
        date: dateTimestamp,
        assignedUserId: user._id,
        completed: true,
        completedAt: Date.now(),
        completedByUserId: user._id,
        notes: args.notes,
      });
    }

    const shiftLabel = args.type === "am" ? "Morning" : "Evening";
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      householdId: household._id,
      excludeUserId: user._id,
      title: `${shiftLabel} shift done!`,
      body: `${user.name} completed ${household.dogName}'s ${shiftLabel.toLowerCase()} walk and meal.`,
    });

    return resultId;
  },
});

// Get care shifts for today
export const getToday = query({
  args: {
    clientDate: v.number(), // Client's local start-of-day timestamp
  },
  handler: async (ctx, args) => {
    const { household } = await getAuthUserWithHousehold(ctx);
    return await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", household._id).eq("date", args.clientDate)
      )
      .collect();
  },
});

// Get care shifts for a date range (for schedule view)
export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { household } = await getAuthUserWithHousehold(ctx);
    return await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q
          .eq("householdId", household._id)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .collect();
  },
});

// Clear assignment (delete if not completed)
export const clearAssignment = mutation({
  args: {
    date: v.number(),
    type: v.union(v.literal("am"), v.literal("pm")),
  },
  handler: async (ctx, args) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    const shift = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", household._id).eq("date", args.date)
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
    const user = await getAuthUser(ctx);
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");
    if (shift.householdId !== user.householdId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.shiftId);
  },
});
