import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, getAuthUserWithHousehold } from "./auth";

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
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const inviteCode = generateInviteCode();

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      dogName: args.dogName,
      inviteCode,
    });

    await ctx.db.patch(user._id, { householdId });

    return { householdId, userId: user._id, inviteCode };
  },
});

export const join = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const household = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!household) {
      throw new Error("Invalid invite code");
    }

    if (user.householdId === household._id) {
      return { householdId: household._id, userId: user._id };
    }

    await ctx.db.patch(user._id, { householdId: household._id });
    return { householdId: household._id, userId: user._id };
  },
});

export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.householdId) return null;
    return await ctx.db.get(user.householdId);
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    await ctx.auth.getUserIdentity(); // auth check
    return await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
  },
});

export const getMembers = query({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("householdId"), household._id))
      .collect();
  },
});
