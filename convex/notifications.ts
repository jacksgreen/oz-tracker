import { internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getHouseholdMemberTokens = internalQuery({
  args: {
    householdId: v.id("households"),
    excludeUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter(
        (u) =>
          u.householdId === args.householdId &&
          u._id !== args.excludeUserId &&
          u.expoPushToken
      )
      .map((u) => u.expoPushToken!);
  },
});

export const sendPushNotification = internalAction({
  args: {
    householdId: v.id("households"),
    excludeUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(
      internal.notifications.getHouseholdMemberTokens,
      {
        householdId: args.householdId,
        excludeUserId: args.excludeUserId,
      }
    );

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default" as const,
      title: args.title,
      body: args.body,
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  },
});
