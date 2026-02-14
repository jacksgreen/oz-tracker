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

const MAX_CODE_RETRIES = 5;
const INVITE_CODE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function generateUniqueInviteCode(ctx: any): Promise<string> {
  for (let i = 0; i < MAX_CODE_RETRIES; i++) {
    const candidate = generateInviteCode();
    const existing = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q: any) => q.eq("inviteCode", candidate))
      .first();
    if (!existing) {
      return candidate;
    }
  }
  throw new Error("Failed to generate a unique invite code. Please try again.");
}

export const create = mutation({
  args: {
    dogName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const inviteCode = await generateUniqueInviteCode(ctx);
    const now = Date.now();

    const householdId = await ctx.db.insert("households", {
      dogName: args.dogName,
      inviteCode,
      inviteCodeCreatedAt: now,
      ownerId: user._id,
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

    if (household.inviteCodeCreatedAt) {
      const codeAge = Date.now() - household.inviteCodeCreatedAt;
      if (codeAge > INVITE_CODE_EXPIRY_MS) {
        throw new Error("This invite code has expired. Ask a household member for a new one.");
      }
    }

    if (user.householdId === household._id) {
      return { householdId: household._id, userId: user._id };
    }

    await ctx.db.patch(user._id, { householdId: household._id });
    return { householdId: household._id, userId: user._id };
  },
});

export const leave = mutation({
  handler: async (ctx) => {
    const { user, household } = await getAuthUserWithHousehold(ctx);

    const members = await ctx.db
      .query("users")
      .withIndex("by_household_id", (q) => q.eq("householdId", household._id))
      .collect();

    if (members.length <= 1) {
      throw new Error(
        "You are the only member. Delete the household instead, or invite someone before leaving."
      );
    }

    // Remove care shifts assigned to this user
    const shifts = await ctx.db
      .query("careShifts")
      .withIndex("by_household_date", (q) => q.eq("householdId", household._id))
      .collect();

    for (const shift of shifts) {
      if (shift.assignedUserId === user._id) {
        await ctx.db.delete(shift._id);
      }
    }

    // If the leaving user is the owner, transfer ownership to the next member
    if (household.ownerId === user._id) {
      const nextOwner = members.find((m) => m._id !== user._id)!;
      await ctx.db.patch(household._id, { ownerId: nextOwner._id });
    }

    await ctx.db.patch(user._id, { householdId: undefined });
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const household = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
    if (!household) return null;

    const expired = household.inviteCodeCreatedAt
      ? Date.now() - household.inviteCodeCreatedAt > INVITE_CODE_EXPIRY_MS
      : false;
    return { dogName: household.dogName, expired };
  },
});

export const regenerateInviteCode = mutation({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    const newCode = await generateUniqueInviteCode(ctx);

    await ctx.db.patch(household._id, {
      inviteCode: newCode,
      inviteCodeCreatedAt: Date.now(),
    });
    return { inviteCode: newCode };
  },
});

export const update = mutation({
  args: {
    dogName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { household } = await getAuthUserWithHousehold(ctx);

    const updates: Record<string, string> = {};
    if (args.dogName !== undefined) updates.dogName = args.dogName;

    if (Object.keys(updates).length === 0) return household;

    await ctx.db.patch(household._id, updates);
    return await ctx.db.get(household._id);
  },
});

export const getMembers = query({
  handler: async (ctx) => {
    const { household } = await getAuthUserWithHousehold(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_household_id", (q) => q.eq("householdId", household._id))
      .collect();
  },
});
