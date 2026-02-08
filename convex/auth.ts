import {
  QueryCtx,
  MutationCtx,
} from "./_generated/server";

/**
 * Get the authenticated user's identity from the JWT.
 * Throws if no valid auth token is present.
 */
export async function getAuthIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

/**
 * Get the Convex user record for the currently authenticated user.
 * Looks up by clerkId (JWT subject). Throws if not found.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await getAuthIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

/**
 * Get the authenticated user and their household.
 * Throws if the user has no household.
 */
export async function getAuthUserWithHousehold(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  if (!user.householdId) {
    throw new Error("User has no household");
  }
  const household = await ctx.db.get(user.householdId);
  if (!household) {
    throw new Error("Household not found");
  }
  return { user, household };
}
