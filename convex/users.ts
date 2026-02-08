import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthIdentity, getAuthUser } from "./auth";

/**
 * Store (upsert) the current user after Clerk sign-in.
 * - If user exists by clerkId → update name/email if changed, return id
 * - If user exists by email → link to Clerk identity (migration path)
 * - Otherwise → create new user
 */
export const store = mutation({
  handler: async (ctx) => {
    const identity = await getAuthIdentity(ctx);
    const clerkId = identity.subject;
    const email = identity.email!;
    const name = identity.name ?? email.split("@")[0];

    // Check by clerkId first
    const existingByClerk = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingByClerk) {
      // Update name/email if changed
      if (existingByClerk.name !== name || existingByClerk.email !== email) {
        await ctx.db.patch(existingByClerk._id, { name, email });
      }
      return existingByClerk._id;
    }

    // Check by email (migration path for existing users)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingByEmail) {
      await ctx.db.patch(existingByEmail._id, { clerkId, name });
      return existingByEmail._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
    });
  },
});

/** Get the current authenticated user. */
export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/** Save an Expo push token for the current user. */
export const savePushToken = mutation({
  args: {
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await ctx.db.patch(user._id, {
      expoPushToken: args.expoPushToken,
    });
  },
});

/** Update the current user's profile. */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    householdId: v.optional(v.id("households")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const filteredUpdates = Object.fromEntries(
      Object.entries(args).filter(([_, value]) => value !== undefined)
    );
    await ctx.db.patch(user._id, filteredUpdates);
  },
});
