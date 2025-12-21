import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const create = mutation({
  args: {
    name: v.string(),
    dogName: v.string(),
    userName: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteCode = generateInviteCode();

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      dogName: args.dogName,
      inviteCode,
    });

    // Find existing user and update with householdId
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .first();

    let userId;
    if (existingUser) {
      await ctx.db.patch(existingUser._id, { householdId });
      userId = existingUser._id;
    } else {
      userId = await ctx.db.insert("users", {
        name: args.userName,
        email: args.userEmail,
        householdId,
      });
    }

    return { householdId, userId, inviteCode };
  },
});

export const join = mutation({
  args: {
    inviteCode: v.string(),
    userName: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!household) {
      throw new Error("Invalid invite code");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .first();

    if (existingUser) {
      if (existingUser.householdId === household._id) {
        return { householdId: household._id, userId: existingUser._id };
      }
      await ctx.db.patch(existingUser._id, { householdId: household._id });
      return { householdId: household._id, userId: existingUser._id };
    }

    const userId = await ctx.db.insert("users", {
      name: args.userName,
      email: args.userEmail,
      householdId: household._id,
    });

    return { householdId: household._id, userId };
  },
});

export const get = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.householdId);
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
  },
});

export const getMembers = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("householdId"), args.householdId))
      .collect();
  },
});
