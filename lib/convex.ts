import { ConvexReactClient } from "convex/react";

// Convex deployment URL
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "https://industrious-warbler-390.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
