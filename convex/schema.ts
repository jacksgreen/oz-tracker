import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  households: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    dogName: v.string(),
  }).index("by_invite_code", ["inviteCode"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    clerkId: v.optional(v.string()),
    householdId: v.optional(v.id("households")),
    expoPushToken: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  // Simplified care shifts - just AM/PM (whoever takes the shift does walk + food)
  careShifts: defineTable({
    householdId: v.id("households"),
    type: v.union(v.literal("am"), v.literal("pm")),
    date: v.number(), // Start of day timestamp (for the scheduled date)
    // Assignment info
    assignedUserId: v.id("users"),
    assignedUserName: v.string(),
    // Completion info (optional until completed)
    completed: v.boolean(),
    completedAt: v.optional(v.number()), // Actual completion timestamp
    completedByUserId: v.optional(v.id("users")),
    completedByUserName: v.optional(v.string()),
    // Optional extras
    notes: v.optional(v.string()),
  }).index("by_household_date", ["householdId", "date"]),

  // One-time appointments (vet visits, etc)
  appointments: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    date: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    completed: v.boolean(),
  }).index("by_household", ["householdId"]),

  // Repeating events (flea medicine, heartworm, etc)
  repeatingEvents: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    // Recurrence settings
    intervalDays: v.number(), // e.g., 14 for every two weeks
    startDate: v.number(), // When the recurrence started
    lastCompletedDate: v.optional(v.number()), // Last time this was done
    // Optional extras
    notes: v.optional(v.string()),
  }).index("by_household", ["householdId"]),
});
